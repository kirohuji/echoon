import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const db = this.prisma as any;
    const rows = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (rows.length > 0) return rows;
    return db.notification.createMany({
      data: [
        {
          userId,
          title: '欢迎使用 Echoon',
          body: '你的学习中心已经就绪，可以从首页加入教材开始学习。',
          type: 'welcome',
        },
      ],
    }).then(async () => db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }));
  }

  markRead(userId: string, id: string) {
    const db = this.prisma as any;
    return db.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }
}

