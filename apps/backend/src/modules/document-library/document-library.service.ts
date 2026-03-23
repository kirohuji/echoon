import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AudioStatus, User } from '@prisma/client';
import axios from 'axios';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type CreateDocumentLibraryInput = {
  title: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  modelName: string;
  tagIds: string[];
};

@Injectable()
export class DocumentLibraryService {
  private readonly audioDir = path.join(process.cwd(), 'uploads', 'audios');

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDocumentLibraryInput, user?: User) {
    const record = await this.prisma.documentLibrary.create({
      data: {
        title: input.title,
        fileName: input.fileName,
        fileType: input.fileType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        filePath: input.filePath,
        modelName: input.modelName,
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
    data: { title?: string; modelName?: string; tagIds?: string[] },
    user?: User,
  ) {
    await this.findOne(id);

    await this.prisma.documentLibrary.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.modelName !== undefined ? { modelName: data.modelName } : {}),
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
    // 为了确保“处理中生成的 mp3”也能被清理，额外尝试删除默认路径：uploads/audios/<id>.mp3
    if (target.audioPath) {
      await fs.unlink(target.audioPath).catch(() => null);
    }
    const fallbackAudioPath = path.join(this.audioDir, `${id}.mp3`);
    await fs.unlink(fallbackAudioPath).catch(() => null);

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

  private guessMinimaxVoiceId(text: string): string {
    // 简单启发式：包含中文字符则用中文 voice，否则用英文 narrator。
    const hasCJK = /[\u4E00-\u9FFF]/.test(text);
    return hasCJK ? 'female-chengshu' : 'English_expressive_narrator';
  }

  /**
   * 调用 minimax TTS(text->speech) 生成 mp3，并写入 uploads/audios/<id>.mp3。
   * 注意：minimax 要求 text < 10,000 characters，本实现会做截断。
   */
  private async generateMinimaxAudioToFile(params: {
    id: string;
    text: string;
    speechModel: string;
    user?: User;
  }): Promise<string> {
    const { id, text, speechModel, user } = params;
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY is not set');
    }

    await fs.mkdir(this.audioDir, { recursive: true });
    const audioPath = path.join(this.audioDir, `${id}.mp3`);

    // minimax 文档要求：text < 10,000 characters
    const inputText = text.length > 10000 ? text.slice(0, 10000) : text;

    const voice_id = this.guessMinimaxVoiceId(inputText);

    const res = await axios.post(
      // 兼容：你当前的 API key 对 minimaxi.com 域名可用
      'https://api.minimaxi.com/v1/t2a_v2',
      {
        model: speechModel,
        text: inputText,
        stream: false,
        language_boost: 'auto',
        output_format: 'hex',
        voice_setting: {
          voice_id,
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          format: 'mp3',
          sample_rate: 32000,
          bitrate: 128000,
          channel: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // minimax 可能生成较慢，给更长超时
        timeout: 180000,
      },
    );

    const baseResp = res?.data?.base_resp as
      | { status_code?: number; status_msg?: string }
      | undefined;
    const traceId = res?.data?.trace_id as string | undefined;
    const statusCode = baseResp?.status_code;
    const statusMsg = baseResp?.status_msg;
    const audioHex = res?.data?.data?.audio as string | undefined;

    // 根据最新文档：失败时 base_resp.status_code != 0，data.audio 可能为空/缺失
    if (statusCode !== 0) {
      throw new Error(
        `minimax t2a_v2 failed: status_code=${statusCode ?? 'unknown'}, status_msg=${statusMsg ?? 'unknown'}${traceId ? `, trace_id=${traceId}` : ''}`,
      );
    }

    if (!audioHex) {
      throw new Error(
        `minimax response contains empty audio${traceId ? `, trace_id=${traceId}` : ''}`,
      );
    }

    const mp3Buffer = Buffer.from(audioHex, 'hex');
    await fs.writeFile(audioPath, mp3Buffer);
    return audioPath;
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
      const speechModel = target.modelName;

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

      // 2) 文本转语音（minimax）
      await this.prisma.documentLibrary.update({
        where: { id },
        data: { audioStage: 'generating_audio', audioProgress: 40 },
      });

      const audioPath = await this.generateMinimaxAudioToFile({
        id,
        text: extractedText || '',
        speechModel,
        user,
      });

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
        updatedBy: user?.id ?? 'system',
      },
    }).then(() => this.findOne(id));
  }

  async generateAudioTextPipeline(id: string, text: string, user?: User): Promise<void> {
    const updatedBy = user?.id ?? 'system';
    try {
      const target = await this.findOne(id);
      if (!target) return;

      const speechModel = target.modelName;
      await this.prisma.documentLibrary.update({
        where: { id },
        data: { audioStage: 'generating_audio', audioProgress: 40, extractedText: text },
      });

      const audioPath = await this.generateMinimaxAudioToFile({
        id,
        text,
        speechModel,
        user,
      });

      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.success,
          audioPath,
          audioProgress: 100,
          audioStage: 'done',
          audioError: null,
          extractedText: text,
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
