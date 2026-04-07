import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortal() {
    const [tags, docs] = await Promise.all([
      this.prisma.tag.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, name: true, description: true },
      }),
      this.prisma.documentLibrary.findMany({
        orderBy: { createdAt: 'desc' },
        take: 18,
        select: { id: true, title: true, fileType: true, createdAt: true },
      }),
    ]);
    return {
      banners: [
        { id: '1', title: '精听训练营', subtitle: '边听边学，强化记忆' },
        { id: '2', title: '口语提升计划', subtitle: '跟读评测，逐步纠音' },
      ],
      categories: tags,
      materials: docs,
    };
  }
}

