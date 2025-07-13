import { Controller, SetMetadata } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MessageService } from './message.service';

// 自定义 Public 装饰器，用于跳过认证
export const Public = () => SetMetadata('isPublic', true);

@Controller('public/conversation')
export class PublicConversationController {
  constructor(private readonly messageService: MessageService) {}

  @Public()
  @EventPattern('message')
  receiveMessage(@Payload() data: any) {
    const { messages, conversation_id, language_code, user_id, participant_id } = data;
    messages.forEach(async (message: any) => {
      if(message.role === 'user'){
        message.senderId = user_id;
      }else{
        message.senderId = participant_id;
      }
      this.messageService.create({
        conversationId: conversation_id,
        content: message.content,
        languageCode: language_code,
        extraMetadata: {},
        senderId: message.senderId || "",
      });
    });
  }
}
