import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyMembership(userId: string) {
    const db = this.prisma as any;
    let row = await db.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) {
      row = await db.membership.create({
        data: {
          userId,
          plan: 'free',
          status: 'active',
          benefits: ['基础学习', '收藏教材', '基础练习'],
        },
      });
    }
    return row;
  }

  listAll() {
    const db = this.prisma as any;
    return db.membership.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  updateByUserId(userId: string, dto: { plan?: string; status?: string; expiresAt?: string | null; benefits?: string[] }) {
    const db = this.prisma as any;
    return db.membership.upsert({
      where: { userId },
      create: {
        userId,
        plan: dto.plan ?? 'free',
        status: dto.status ?? 'active',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        benefits: dto.benefits ?? [],
      },
      update: {
        ...(dto.plan !== undefined ? { plan: dto.plan } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
      },
    });
  }
}

