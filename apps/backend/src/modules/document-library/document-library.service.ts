import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AudioProvider, AudioStatus, Prisma, User } from '@prisma/client';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveDocumentAudioConfig } from './document-audio.config';
import { DocumentAudioProviderFactory } from './document-audio-provider.factory';
import { CreateDocumentAudioConfigInput, DocumentAudioRegenerateOverrides } from './document-audio.types';
import { DOCUMENT_AUDIO_PARAMS_SCHEMA, sanitizeRegenerateAudioParams } from './document-audio-params.schema';

type CreateDocumentLibraryInput = CreateDocumentAudioConfigInput & {
  title: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  tagIds: string[];
};

@Injectable()
export class DocumentLibraryService {
  private readonly audioDir = path.join(process.cwd(), 'uploads', 'audios');

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentAudioProviderFactory: DocumentAudioProviderFactory
  ) {}

  async create(input: CreateDocumentLibraryInput, user?: User) {
    const audioConfig = resolveDocumentAudioConfig({
      provider: input.provider,
      model: input.model,
      voiceId: input.voiceId,
      legacyModelName: input.legacyModelName,
    });

    const record = await this.prisma.documentLibrary.create({
      data: {
        title: input.title,
        fileName: input.fileName,
        fileType: input.fileType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        filePath: input.filePath,
        modelName: audioConfig.legacyModelName,
        audioProvider: audioConfig.provider,
        audioModel: audioConfig.model,
        audioVoiceId: audioConfig.voiceId,
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
    const audioConfig = resolveDocumentAudioConfig({
      provider: data.audioProvider ?? existing.audioProvider,
      model: data.audioModel ?? existing.audioModel ?? data.modelName ?? existing.modelName,
      voiceId: data.audioVoiceId ?? existing.audioVoiceId,
      legacyModelName: data.modelName ?? existing.modelName,
    });

    await this.prisma.documentLibrary.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.modelName !== undefined || data.audioModel !== undefined || data.audioProvider !== undefined
          ? {
              modelName: audioConfig.legacyModelName,
              audioProvider: audioConfig.provider,
              audioModel: audioConfig.model,
              audioVoiceId: audioConfig.voiceId,
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
      const providerConfig = resolveDocumentAudioConfig({
        provider: target.audioProvider,
        model: target.audioModel ?? target.modelName,
        voiceId: target.audioVoiceId,
        legacyModelName: target.modelName,
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
          wordTimestamps: this.toWordTimestampJson(result.wordTimestamps),
          updatedBy,
        },
      });
    } catch (error) {
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.failed,
          audioError:
            error instanceof Error ? error.message : 'generate audio pipeline failed',
          audioStage: 'failed',
          // 保留当前 extractedText（如已写入），进度标记为 0 更符合语义
          audioProgress: 0,
          updatedBy,
        },
      });
    }
  }

  async startGenerateAudioFromText(id: string, text: string, user?: User) {
    return this.prisma.documentLibrary.update({
      where: { id },
      data: {
        audioStatus: AudioStatus.processing,
        audioProgress: 40,
        audioStage: 'generating_audio',
        audioError: null,
        extractedText: text,
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

      const providerConfig = resolveDocumentAudioConfig({
        provider: overrides?.audioProvider ?? target.audioProvider,
        model: overrides?.audioModel ?? target.audioModel ?? target.modelName,
        voiceId: overrides?.audioVoiceId ?? target.audioVoiceId,
        legacyModelName: target.modelName,
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
          extractedText: text,
          wordTimestamps: Prisma.JsonNull,
        },
      });

      const provider = this.documentAudioProviderFactory.getProvider(providerConfig.provider);
      const result = await provider.generateAudio({
        id,
        text,
        model: providerConfig.model,
        voiceId: providerConfig.voiceId,
        params: sanitizedParams,
      });
      const audioPath = await this.writeAudioFile(id, result.fileExtension, result.audioBuffer);

      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.success,
          audioPath,
          audioProgress: 100,
          audioStage: 'done',
          audioError: null,
          extractedText: text,
          wordTimestamps: this.toWordTimestampJson(result.wordTimestamps),
          updatedBy,
        },
      });
    } catch (error) {
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.failed,
          audioError:
            error instanceof Error ? error.message : 'generate audio from text failed',
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
}
