import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { User } from '@prisma/client';

type TagPayload = {
  name: string;
  description?: string;
};

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: TagPayload, user?: User) {
    return this.prisma.tag.create({
      data: {
        name: data.name.trim(),
        description: data.description,
        createdBy: user?.id ?? 'system',
        updatedBy: user?.id ?? 'system',
      },
    });
  }

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Partial<TagPayload>, user?: User) {
    return this.prisma.tag.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        updatedBy: user?.id ?? 'system',
      },
    });
  }

  async remove(id: string) {
    return this.prisma.tag.delete({ where: { id } });
  }

  async paginate(page = 1, limit = 10, keyword = '') {
    const skip = (page - 1) * limit;
    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { description: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
