import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AudioProvider, AudioStatus, DocumentLibrary, Prisma, User } from '@prisma/client';
import axios from 'axios';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as wordnet from 'wordnet';
import {
  DocumentAudioConfigError,
  resolveDocumentAudioConfigForGeneration,
} from './document-audio.config';
import { DocumentAudioProviderFactory } from './document-audio-provider.factory';
import {
  CreateDocumentAudioConfigInput,
  DocumentAudioConfig,
  DocumentAudioRegenerateOverrides,
} from './document-audio.types';
import { DOCUMENT_AUDIO_PARAMS_SCHEMA, sanitizeRegenerateAudioParams } from './document-audio-params.schema';
import { DocumentWordTimestamp } from './document-audio.types';

type CreateDocumentLibraryInput = CreateDocumentAudioConfigInput & {
  title: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  tagIds: string[];
  /** 创建时即写入（纯文本资料），避免仅存在磁盘文件时前端「提取文本」一直为空 */
  extractedText?: string | null;
};

@Injectable()
export class DocumentLibraryService {
  private readonly audioDir = path.join(process.cwd(), 'uploads', 'audios');
  private readonly sentenceEndRegex = /[.!?。！？；;:]$/;
  private wordnetReadyPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentAudioProviderFactory: DocumentAudioProviderFactory
  ) {}

  async create(input: CreateDocumentLibraryInput, user?: User) {
    const initialText =
      typeof input.extractedText === 'string' && input.extractedText.trim().length > 0
        ? input.extractedText.trim()
        : undefined;

    const modelNameStored =
      input.legacyModelName?.trim() || input.model?.trim() || null;
    const audioModelStored = input.model?.trim() || null;
    // 未跑迁移时 DB 上 modelName 可能仍为 NOT NULL，用空串占位；已迁移为可空时同样合法。
    const modelNameForDb = modelNameStored ?? '';
    const voiceStored = input.voiceId?.trim() || null;

    const record = await this.prisma.documentLibrary.create({
      data: {
        title: input.title,
        fileName: input.fileName,
        fileType: input.fileType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        filePath: input.filePath,
        ...(initialText !== undefined ? { extractedText: initialText } : {}),
        modelName: modelNameForDb,
        // 未配置时不传 audioProvider，旧库 NOT NULL + DEFAULT(minimax) 可走库默认值；新库可空时由后续更新写入。
        ...(input.provider != null ? { audioProvider: input.provider } : {}),
        audioModel: audioModelStored,
        audioVoiceId: voiceStored,
        audioStatus: AudioStatus.pending,
        userId: user?.id ?? 'system',
        createdBy: user?.id ?? 'system',
        updatedBy: user?.id ?? 'system',
      },
    });

    if (input.tagIds.length > 0) {
      await this.prisma.documentLibraryTag.createMany({
        data: input.tagIds.map((tagId) => ({
          documentLibraryId: record.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOne(record.id);
  }

  /**
   * 生成音频前校验：库内记录 + 可选本次请求覆盖项是否构成完整 TTS 配置。
   */
  assertTtsConfigForGeneration(
    record: DocumentLibrary,
    overrides?: DocumentAudioRegenerateOverrides
  ): DocumentAudioConfig {
    try {
      return resolveDocumentAudioConfigForGeneration({
        provider: (overrides?.audioProvider ?? record.audioProvider) ?? undefined,
        model:
          overrides?.audioModel ??
          record.audioModel ??
          record.modelName ??
          null,
        voiceId:
          overrides?.audioVoiceId !== undefined
            ? overrides.audioVoiceId
            : record.audioVoiceId,
        legacyModelName: record.modelName ?? undefined,
      });
    } catch (e) {
      if (e instanceof DocumentAudioConfigError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  async findOne(id: string) {
    const data = await this.prisma.documentLibrary.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Document not found');
    }
    return data;
  }

  async findAll() {
    return this.prisma.documentLibrary.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getAudioParamsSchema() {
    return DOCUMENT_AUDIO_PARAMS_SCHEMA;
  }

  private async ensureWordnetReady() {
    if (!this.wordnetReadyPromise) {
      this.wordnetReadyPromise = wordnet.init();
    }
    await this.wordnetReadyPromise;
  }

  private normalizeLookupWord(input: string) {
    return (input || '')
      .trim()
      .toLowerCase()
      .replace(/^[^a-z\s'-]+|[^a-z\s'-]+$/g, '')
      .replace(/\s+/g, ' ');
  }

  async lookupEnglishWord(word: string) {
    const normalizedWord = this.normalizeLookupWord(word);
    if (!normalizedWord) {
      return { word: '', definitions: [] };
    }

    await this.ensureWordnetReady();
    try {
      const variants = Array.from(
        new Set([
          normalizedWord,
          normalizedWord.replace(/\s+/g, '_'),
          normalizedWord.replace(/'/g, ''),
          normalizedWord.replace(/\s+/g, '_').replace(/'/g, ''),
        ])
      ).filter(Boolean);

      let rows: any[] = [];
      for (const variant of variants) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const result = await wordnet.lookup(variant, true);
          if (Array.isArray(result) && result.length) {
            rows = result;
            break;
          }
        } catch {
          // try next variant
        }
      }
      return {
        word: normalizedWord,
        definitions: (rows || []).slice(0, 6).map((item) => ({
          partOfSpeech: item?.meta?.synsetType || 'unknown',
          gloss: item?.glossary || '',
          synonyms: (item?.meta?.words || [])
            .map((w) => String(w?.word ?? '').replace(/_/g, ' '))
            .filter(Boolean)
            .slice(0, 6),
        })),
      };
    } catch {
      return { word: normalizedWord, definitions: [] };
    }
  }

  async paginate({
    page = 1,
    limit = 10,
    keyword = '',
    tagId,
  }: {
    page?: number;
    limit?: number;
    keyword?: string;
    tagId?: string;
  }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { fileName: { contains: keyword, mode: 'insensitive' as const } },
              { modelName: { contains: keyword, mode: 'insensitive' as const } },
              { audioModel: { contains: keyword, mode: 'insensitive' as const } },
              { audioVoiceId: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(tagId
        ? {
            tags: {
              some: {
                tagId,
              },
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.documentLibrary.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentLibrary.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(
    id: string,
    data: {
      title?: string;
      modelName?: string;
      tagIds?: string[];
      audioProvider?: AudioProvider;
      audioModel?: string;
      audioVoiceId?: string;
    },
    user?: User,
  ) {
    const existing = await this.findOne(id);
    const patchAudio =
      data.modelName !== undefined ||
      data.audioModel !== undefined ||
      data.audioProvider !== undefined ||
      data.audioVoiceId !== undefined;

    const nextProvider =
      data.audioProvider !== undefined ? data.audioProvider : existing.audioProvider;
    const nextAudioModel =
      data.audioModel !== undefined ? data.audioModel : existing.audioModel;
    const nextModelName =
      data.modelName !== undefined ? data.modelName : existing.modelName;
    const nextVoiceId =
      data.audioVoiceId !== undefined ? data.audioVoiceId : existing.audioVoiceId;

    await this.prisma.documentLibrary.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(patchAudio
          ? {
              audioProvider: nextProvider,
              audioModel: nextAudioModel,
              modelName: nextModelName ?? nextAudioModel ?? '',
              audioVoiceId: nextVoiceId,
            }
          : {}),
        updatedBy: user?.id ?? 'system',
      },
    });

    if (data.tagIds) {
      await this.prisma.documentLibraryTag.deleteMany({
        where: { documentLibraryId: id },
      });
      if (data.tagIds.length > 0) {
        await this.prisma.documentLibraryTag.createMany({
          data: data.tagIds.map((tagId) => ({ documentLibraryId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const target = await this.findOne(id);

    await this.prisma.documentLibrary.delete({ where: { id } });

    if (target.filePath) {
      await fs.unlink(target.filePath).catch(() => null);
    }
    // audioPath 仅在 success 后才会写入 DB。
    // 为了确保处理中遗留文件也能被清理，额外尝试删除常见扩展名。
    if (target.audioPath) {
      await fs.unlink(target.audioPath).catch(() => null);
    }
    const fallbackAudioPath = path.join(this.audioDir, `${id}.mp3`);
    await fs.unlink(fallbackAudioPath).catch(() => null);
    const fallbackWavPath = path.join(this.audioDir, `${id}.wav`);
    await fs.unlink(fallbackWavPath).catch(() => null);

    return { success: true };
  }

  /**
   * Extract text from a local PDF file using pdfjs-dist (legacy build).
   * Returns a plain concatenated text string (page-separated by newlines).
   */
  async extractPdfText(
    filePath: string,
    onProgress?: (params: {
      pageNumber: number;
      totalPages: number;
      textSoFar: string;
    }) => Promise<void>,
  ): Promise<string> {
    // pdfjs-dist 在 Node 环境：使用 legacy build 的 mjs 入口。
    const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // 直接传 Buffer 更稳，不依赖 pdfjs 的“本地文件路径读取”行为。
    const pdfBuffer = await fs.readFile(filePath);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages ?? 0;
    let text = '';

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const strings = (textContent.items ?? []).map((item: any) => item.str ?? '');
      text += `${strings.join(' ')}\n`;

      if (onProgress && (pageNumber === totalPages || pageNumber % 2 === 0)) {
        // 避免每页都写库，使用“每两页/最后一页”更新一次。
        await onProgress({ pageNumber, totalPages, textSoFar: text.trim() });
      }
    }

    return text.trim();
  }

  private async writeAudioFile(id: string, extension: 'mp3' | 'wav', buffer: Buffer) {
    await fs.mkdir(this.audioDir, { recursive: true });
    const audioPath = path.join(this.audioDir, `${id}.${extension}`);
    await fs.writeFile(audioPath, buffer);
    return audioPath;
  }

  private toWordTimestampJson(wordTimestamps: unknown[] | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return wordTimestamps?.length
      ? (wordTimestamps as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  private buildSentenceSegments(words: DocumentWordTimestamp[]) {
    if (!words.length) return [] as Array<{ sentenceIndex: number; text: string; startIdx: number; endIdx: number }>;
    const starts = [0];
    for (let i = 0; i < words.length - 1; i += 1) {
      if (this.sentenceEndRegex.test(words[i].text || '')) starts.push(i + 1);
    }
    const uniqueStarts = Array.from(new Set(starts)).sort((a, b) => a - b);
    return uniqueStarts.map((startIdx, idx) => {
      const endIdx = (uniqueStarts[idx + 1] ?? words.length) - 1;
      const text = words.slice(startIdx, endIdx + 1).map((item) => item.text).join(' ').trim();
      return { sentenceIndex: idx, text, startIdx, endIdx };
    });
  }

  private parseTranslationsContent(content: string, sentenceCount: number) {
    const direct = (() => {
      try {
        const parsed = JSON.parse(content) as { translations?: string[] };
        return Array.isArray(parsed.translations) ? parsed.translations : null;
      } catch {
        return null;
      }
    })();
    if (direct) return direct.map((item) => String(item ?? '').trim());

    const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      try {
        const parsed = JSON.parse(fencedMatch[1]) as { translations?: string[] };
        if (Array.isArray(parsed.translations)) {
          return parsed.translations.map((item) => String(item ?? '').trim());
        }
      } catch {
        // ignore
      }
    }

    const lines = content
      .split('\n')
      .map((item) => item.replace(/^\s*[-*\d.)]+\s*/, '').trim())
      .filter(Boolean);
    if (!lines.length) return [];
    return lines.slice(0, sentenceCount);
  }

  private async translateSentencesToChinese(sentences: string[]) {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey || !sentences.length) return [] as string[];
    try {
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content:
                '你是翻译助手。请把输入句子逐句翻译为简体中文，严格保持顺序与数量一致，不要解释。',
            },
            {
              role: 'user',
              content: [
                '请返回 JSON：{"translations":["..."]}',
                `translations 数组长度必须等于 ${sentences.length}。`,
                '待翻译句子：',
                ...sentences.map((sentence, index) => `${index + 1}. ${sentence}`),
              ].join('\n'),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );
      const rawContent = response?.data?.choices?.[0]?.message?.content;
      const content =
        typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent
                .map((item) =>
                  typeof item === 'string'
                    ? item
                    : typeof item?.text === 'string'
                      ? item.text
                      : ''
                )
                .join('\n')
            : '';
      if (!content) return [];
      const parsed = this.parseTranslationsContent(content, sentences.length);
      if (parsed.length === sentences.length) return parsed;
      // 长度不匹配时，按已翻译部分返回，缺失项回退原句，避免空值污染 UI
      return sentences.map((sentence, index) => parsed[index]?.trim() || sentence);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('DeepSeek translation failed', error);
      return [];
    }
  }

  private async enrichWordTimestampsWithSentenceTranslation(wordTimestamps: DocumentWordTimestamp[] | null) {
    if (!wordTimestamps?.length) return null;
    const words = [...wordTimestamps].sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0));
    const sentenceSegments = this.buildSentenceSegments(words).map((segment) => {
      const existingZh = words
        .slice(segment.startIdx, segment.endIdx + 1)
        .find((item) => item.sentenceZh?.trim())?.sentenceZh;
      const existingText = words
        .slice(segment.startIdx, segment.endIdx + 1)
        .find((item) => item.sentenceText?.trim())?.sentenceText;
      return {
        ...segment,
        text: (existingText || segment.text).trim(),
        existingZh: existingZh?.trim() || '',
      };
    });
    if (!sentenceSegments.length) return words;

    // 仅翻译“没有已有翻译”的句子，并按 sentenceText 去重，避免重复调用。
    const uniquePendingTexts: string[] = [];
    const pendingTextSet = new Set<string>();
    for (const segment of sentenceSegments) {
      if (segment.existingZh) continue;
      if (!segment.text) continue;
      if (pendingTextSet.has(segment.text)) continue;
      pendingTextSet.add(segment.text);
      uniquePendingTexts.push(segment.text);
    }
    const uniquePendingTranslations = uniquePendingTexts.length
      ? await this.translateSentencesToChinese(uniquePendingTexts)
      : [];
    const translationMap = new Map<string, string>();
    uniquePendingTexts.forEach((text, idx) => {
      const zh = uniquePendingTranslations[idx]?.trim();
      if (zh) translationMap.set(text, zh);
    });

    const merged = [...words];
    sentenceSegments.forEach((segment) => {
      const sentenceZh = segment.existingZh || translationMap.get(segment.text) || '';
      for (let i = segment.startIdx; i <= segment.endIdx; i += 1) {
        merged[i] = {
          ...merged[i],
          sentenceIndex: segment.sentenceIndex,
          sentenceText: segment.text,
          sentenceZh,
        };
      }
    });
    return merged;
  }

  async startGenerateAudio(id: string, user?: User) {
    // 重置本次运行状态，便于前端展示进度/文本。
    await this.prisma.documentLibrary.update({
      where: { id },
      data: {
        audioStatus: AudioStatus.processing,
        audioProgress: 0,
        audioStage: 'extracting_text',
        audioError: null,
        extractedText: null,
        wordTimestamps: Prisma.JsonNull,
        updatedBy: user?.id ?? 'system',
      },
    });

    return this.findOne(id);
  }

  async generateAudioPipeline(id: string, user?: User): Promise<void> {
    const updatedBy = user?.id ?? 'system';

    try {
      const target = await this.findOne(id);
      if (!target.filePath) {
        throw new Error('documentLibrary.filePath is empty');
      }
      const providerConfig = resolveDocumentAudioConfigForGeneration({
        provider: target.audioProvider ?? undefined,
        model: target.audioModel ?? target.modelName,
        voiceId: target.audioVoiceId,
        legacyModelName: target.modelName ?? undefined,
      });

      // 1) 提取文本
      await this.prisma.documentLibrary.update({
        where: { id },
        data: { audioStage: 'extracting_text', audioProgress: 0 },
      });

      let extractedText = '';
      const fileType = target.fileType?.toLowerCase() ?? '';

      if (fileType === 'pdf') {
        extractedText = await this.extractPdfText(target.filePath, async ({ pageNumber, totalPages, textSoFar }) => {
          const progress = totalPages ? Math.round((pageNumber / totalPages) * 30) : 10;
          await this.prisma.documentLibrary.update({
            where: { id },
            data: {
              audioStage: 'extracting_text',
              audioProgress: progress,
              extractedText: textSoFar,
            },
          });
        });
      } else if (fileType === 'txt' || target.mimeType?.startsWith('text/')) {
        // txt/自定义文本：直接读取内容并写库（视作抽取阶段完成）
        const raw = await fs.readFile(target.filePath, 'utf8');
        extractedText = raw.trim();
        await this.prisma.documentLibrary.update({
          where: { id },
          data: {
            audioStage: 'extracting_text',
            audioProgress: 30,
            extractedText,
          },
        });
      } else {
        throw new Error(`Unsupported document fileType for extraction: ${fileType}`);
      }

      if (!extractedText.trim()) {
        throw new DocumentAudioConfigError(
          '未能从资料中得到可用于合成的文本，请检查 PDF 或文本文件是否包含正文'
        );
      }

      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStage: 'generating_audio',
          audioProgress: 30,
          extractedText,
        },
      });

      // 2) 文本转语音（provider）
      await this.prisma.documentLibrary.update({
        where: { id },
        data: { audioStage: 'generating_audio', audioProgress: 40 },
      });

      const provider = this.documentAudioProviderFactory.getProvider(providerConfig.provider);
      const result = await provider.generateAudio({
        id,
        text: extractedText || '',
        model: providerConfig.model,
        voiceId: providerConfig.voiceId,
      });
      const audioPath = await this.writeAudioFile(id, result.fileExtension, result.audioBuffer);
      const enrichedWordTimestamps = await this.enrichWordTimestampsWithSentenceTranslation(
        result.wordTimestamps
      );

      // 3) 写入完成状态
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.success,
          audioPath,
          audioProgress: 100,
          audioStage: 'done',
          audioError: null,
          extractedText,
          wordTimestamps: this.toWordTimestampJson(enrichedWordTimestamps),
          updatedBy,
        },
      });
    } catch (error) {
      const audioError =
        error instanceof DocumentAudioConfigError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'generate audio pipeline failed';
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.failed,
          audioError,
          audioStage: 'failed',
          // 保留当前 extractedText（如已写入），进度标记为 0 更符合语义
          audioProgress: 0,
          updatedBy,
        },
      });
    }
  }

  async startGenerateAudioFromText(id: string, text: string, user?: User) {
    const trimmed = text.trim();
    return this.prisma.documentLibrary.update({
      where: { id },
      data: {
        audioStatus: AudioStatus.processing,
        audioProgress: 40,
        audioStage: 'generating_audio',
        audioError: null,
        extractedText: trimmed,
        wordTimestamps: Prisma.JsonNull,
        updatedBy: user?.id ?? 'system',
      },
    }).then(() => this.findOne(id));
  }

  async generateAudioTextPipeline(
    id: string,
    text: string,
    overrides?: DocumentAudioRegenerateOverrides,
    user?: User
  ): Promise<void> {
    const updatedBy = user?.id ?? 'system';
    try {
      const target = await this.findOne(id);
      if (!target) return;

      const textTrimmed = text.trim();
      if (!textTrimmed) {
        throw new DocumentAudioConfigError('提取文本为空，无法生成音频');
      }

      const providerConfig = resolveDocumentAudioConfigForGeneration({
        provider: (overrides?.audioProvider ?? target.audioProvider) ?? undefined,
        model:
          overrides?.audioModel ??
          target.audioModel ??
          target.modelName ??
          null,
        voiceId:
          overrides?.audioVoiceId !== undefined
            ? overrides.audioVoiceId
            : target.audioVoiceId,
        legacyModelName: target.modelName ?? undefined,
      });
      const sanitizedParams = sanitizeRegenerateAudioParams(
        providerConfig.provider,
        providerConfig.model,
        overrides?.params
      );
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStage: 'generating_audio',
          audioProgress: 40,
          extractedText: textTrimmed,
          wordTimestamps: Prisma.JsonNull,
          audioProvider: providerConfig.provider,
          audioModel: providerConfig.model,
          audioVoiceId: providerConfig.voiceId,
          modelName: providerConfig.legacyModelName,
        },
      });

      const provider = this.documentAudioProviderFactory.getProvider(providerConfig.provider);
      const result = await provider.generateAudio({
        id,
        text: textTrimmed,
        model: providerConfig.model,
        voiceId: providerConfig.voiceId,
        params: sanitizedParams,
      });
      const audioPath = await this.writeAudioFile(id, result.fileExtension, result.audioBuffer);
      const enrichedWordTimestamps = await this.enrichWordTimestampsWithSentenceTranslation(
        result.wordTimestamps
      );

      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.success,
          audioPath,
          audioProgress: 100,
          audioStage: 'done',
          audioError: null,
          extractedText: textTrimmed,
          wordTimestamps: this.toWordTimestampJson(enrichedWordTimestamps),
          audioProvider: providerConfig.provider,
          audioModel: providerConfig.model,
          audioVoiceId: providerConfig.voiceId,
          modelName: providerConfig.legacyModelName,
          updatedBy,
        },
      });
    } catch (error) {
      const audioError =
        error instanceof DocumentAudioConfigError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'generate audio from text failed';
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.failed,
          audioError,
          audioStage: 'failed',
          audioProgress: 0,
          updatedBy,
        },
      });
    }
  }

  /**
   * 兼容旧调用：同步等待整个 pipeline 完成。
   * 当前前端通过控制器会走异步模式。
   */
  async generateAudio(id: string, user?: User) {
    await this.startGenerateAudio(id, user);
    await this.generateAudioPipeline(id, user);
    return this.findOne(id);
  }

  async generateSentenceTranslation(id: string, user?: User) {
    const record = await this.findOne(id);
    const rawWordTimestamps = Array.isArray(record.wordTimestamps)
      ? (record.wordTimestamps as unknown as DocumentWordTimestamp[])
      : null;
    const baseWordTimestamps = rawWordTimestamps?.length ? rawWordTimestamps : null;
    if (!baseWordTimestamps?.length) {
      throw new BadRequestException(
        '当前文档没有词级时间戳，无法按句生成翻译（部分 TTS 不提供该数据，例如 MiniMax）'
      );
    }
    const enrichedWordTimestamps = await this.enrichWordTimestampsWithSentenceTranslation(
      baseWordTimestamps
    );
    await this.prisma.documentLibrary.update({
      where: { id },
      data: {
        wordTimestamps: this.toWordTimestampJson(enrichedWordTimestamps),
        updatedBy: user?.id ?? 'system',
      },
    });
    return this.findOne(id);
  }
}
