import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { User, Conversation, Participant } from '@prisma/client';
import { CrudService } from '@/common/crud.service';
import { MessageService } from './message.service';
import { ParticipantService } from './participant.service';
import { PersonalService } from '../personal/personal.service';

@Injectable()
export class ConversationService extends CrudService<Conversation> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly personalService: PersonalService,
  ) {
    super(prisma, 'conversation');
  }

  async getParticipantInfo(p: Participant) {
    if (p.isPersonal) {
      // 查 personal 表
      const personal = await this.prisma.personal.findUnique({
        where: { id: p.personalUserId ?? '' },
      });
      return { ...p, info: personal, infoType: 'personal' };
    } else {
      // 查 profile 表
      const profile = await this.prisma.profile.findUnique({
        where: { id: p.profileUserId ?? '' },
      });
      return { ...p, info: profile, infoType: 'profile' };
    }
  }

  // 获取某用户参与的所有会话
  async getConversationsByUserId(userId: string) {
    return await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            OR: [{ profileUserId: userId }, { personalUserId: userId }],
          },
        },
      },
      include: {
        participants: {
          include: {
            profile: true,
            personal: true,
          },
        },
      },
    });
  }

  // 根据会话id获取会话详情
  async getConversationById(
    id: string,
    page: number = 1,
    pageSize: number = 20,
  ) {
    // 查询会话基本信息
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    // 查询分页消息
    const skip = (page - 1) * pageSize;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.message.count({ where: { conversationId: id } }),
    ]);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    const participantsWithInfo = await Promise.all(
      conversation.participants.map((p) => this.getParticipantInfo(p)),
    );

    return {
      ...conversation,
      participants: participantsWithInfo,
      messages: {
        data: messages,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // 根据会话id分页获取消息记录
  async getMessagesByConversationId(
    conversationId: string,
    page: number = 1,
    pageSize: number = 20,
  ) {
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

  async createConversationWithUser(
    conversation: Omit<Conversation, 'id'>,
    users: { userId: string; isPersonal: boolean }[],
  ) {
    const newConversation = await this.prisma.conversation.create({
      data: conversation,
    });
    const participants = users.map(({ userId, isPersonal }) => ({
      conversationId: newConversation.id,
      profileUserId: isPersonal ? null : userId,
      personalUserId: isPersonal ? userId : null,
      isPersonal,
    }));
    await this.prisma.participant.createMany({
      data: participants,
    });
    return newConversation;
  }

  async createConversationWithDefaultPersonal(user: User) {
    const personals = await this.personalService.findAll();
    personals.forEach(async (personal) => {
      const conversation = await this.createConversationWithUser(
        {
          title: personal.name,
          type: 'personal',
          createdBy: user.id,
          updatedBy: user.id,
          messageCount: 0,
          isRemoved: false,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        [
          {
            userId: personal.id,
            isPersonal: true,
          },
          {
            userId: user.id,
            isPersonal: false,
          },
        ],
      );
      return conversation;
    });
  }
}
