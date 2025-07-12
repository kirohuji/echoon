import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MessageService } from './message.service';
import { PublicConversationController } from './public.conversation.controller';
import { ParticipantService } from './participant.service';

@Module({
  imports: [
    PrismaModule.forRoot({ isGlobal: true }),
  ],
  controllers: [ConversationController, PublicConversationController],
  providers: [
    ConversationService,  
    MessageService,
    ParticipantService,
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
