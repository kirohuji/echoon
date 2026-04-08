import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserPushService } from '@/modules/realtime/user-push.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPush: UserPushService,
  ) {}

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

  async markRead(userId: string, id: string) {
    const db = this.prisma as any;
    const result = await db.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    this.userPush.notifyNotificationsChanged(userId);
    return result;
  }

  listAll() {
    const db = this.prisma as any;
    return db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createForUser(dto: {
    userId?: string;
    title: string;
    body: string;
    type?: string;
    imageUrl?: string | null;
  }) {
    const db = this.prisma as any;
    const title = dto.title.trim();
    const body = dto.body.trim();
    const type = dto.type?.trim() || 'system';
    const imageUrl = dto.imageUrl || null;
    const userId = dto.userId?.trim();

    if (userId) {
      const row = await db.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          imageUrl,
        },
      });
      this.userPush.notifyNotificationsChanged(userId);
      return row;
    }

    const users = await db.user.findMany({
      select: { id: true },
      where: { status: 1 },
    });
    if (users.length === 0) {
      return { createdCount: 0, broadcast: true };
    }
    await db.notification.createMany({
      data: users.map((u: { id: string }) => ({
        userId: u.id,
        title,
        body,
        type,
        imageUrl,
      })),
    });
    for (const u of users as { id: string }[]) {
      this.userPush.notifyNotificationsChanged(u.id);
    }
    return { createdCount: users.length, broadcast: true };
  }
}

