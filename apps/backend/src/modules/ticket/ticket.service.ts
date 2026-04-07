import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(userId: string) {
    const db = this.prisma as any;
    return db.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  create(userId: string, dto: { subject: string; content: string }) {
    const db = this.prisma as any;
    return db.ticket.create({
      data: {
        userId,
        subject: dto.subject.trim(),
        content: dto.content.trim(),
        status: 'open',
      },
    });
  }

  listAll() {
    const db = this.prisma as any;
    return db.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  updateStatus(id: string, status: string) {
    const db = this.prisma as any;
    return db.ticket.update({
      where: { id },
      data: { status },
    });
  }
}

