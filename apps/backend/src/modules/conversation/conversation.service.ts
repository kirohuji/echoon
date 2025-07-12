
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
}