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
}

