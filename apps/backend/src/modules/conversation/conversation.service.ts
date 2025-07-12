
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Conversation } from '@prisma/client';
import { CrudService } from '@/common/crud.service';
import { MessageService } from './message.service';
import { ParticipantService } from './participant.service';

@Injectable()
export class ConversationService extends CrudService<Conversation> {
  constructor(prisma: PrismaService, private readonly messageService: MessageService, private readonly participantService: ParticipantService) {
    super(prisma, 'conversation');
  }
  
  async createConversationWithUser(conversation: Conversation, userIds: string[]) {
    const newConversation = await this.prisma.conversation.create({
      data: conversation,
    });
    const participants = userIds.map(userId => ({
      conversationId: newConversation.id,
      userId,
    }));
    await this.prisma.participant.createMany({
      data: participants,
    });
    return newConversation;
  }

  // 获取某用户参与的所有会话
  async getConversationsByUserId(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
    });
  }

  // 根据会话id获取会话详情
  async getConversationById(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
    });
  }

  // 根据会话id分页获取消息记录
  async getMessagesByConversationId(conversationId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return {
      data: messages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}