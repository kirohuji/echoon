import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MessageService } from './message.service';
import { PublicConversationController } from './public.conversation.controller';

@Module({
  imports: [
    PrismaModule.forRoot({ isGlobal: true }),
  ],
  controllers: [ConversationController, PublicConversationController],
  providers: [
    ConversationService,  
    MessageService,
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
