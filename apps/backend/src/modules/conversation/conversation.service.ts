
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Conversation } from '@prisma/client';
import { CrudService } from '@/common/crud.service';
import { MessageService } from './message.service';

@Injectable()
export class ConversationService extends CrudService<Conversation> {
  constructor(prisma: PrismaService, private readonly messageService: MessageService) {
    super(prisma, 'conversation');
  }
}