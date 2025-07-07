import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '@/common/crud.controller';
import { ConversationService } from './conversation.service';
import { Conversation } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('conversation')
export class ConversationController extends CrudController<Conversation> {
  constructor(
    private readonly conversationService: ConversationService) {
    super(conversationService);
  }
}