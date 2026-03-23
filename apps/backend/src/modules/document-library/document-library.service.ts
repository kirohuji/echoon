import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AudioStatus, User } from '@prisma/client';
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
    if (target.audioPath) {
      await fs.unlink(target.audioPath).catch(() => null);
    }

    return { success: true };
  }

  async generateAudio(id: string, user?: User) {
    const target = await this.findOne(id);

    await this.prisma.documentLibrary.update({
      where: { id },
      data: {
        audioStatus: AudioStatus.processing,
        audioError: null,
        updatedBy: user?.id ?? 'system',
      },
    });

    try {
      await fs.mkdir(this.audioDir, { recursive: true });
      const audioPath = path.join(this.audioDir, `${id}.mp3`);
      await fs.writeFile(audioPath, Buffer.alloc(0));

      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.success,
          audioPath,
          updatedBy: user?.id ?? 'system',
        },
      });
    } catch (error) {
      await this.prisma.documentLibrary.update({
        where: { id },
        data: {
          audioStatus: AudioStatus.failed,
          audioError: error instanceof Error ? error.message : 'generate audio failed',
          updatedBy: user?.id ?? 'system',
        },
      });
    }

    return this.findOne(target.id);
  }
}
