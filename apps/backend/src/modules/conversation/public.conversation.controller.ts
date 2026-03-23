import { Body, Controller, Post, SetMetadata } from '@nestjs/common';
import { MessageService } from './message.service';

// 自定义 Public 装饰器，用于跳过认证
export const Public = () => SetMetadata('isPublic', true);

/** 原 RabbitMQ EventPattern('message') 改为 HTTP，供其它服务回调 */
@Controller('public/conversation')
export class PublicConversationController {
  constructor(private readonly messageService: MessageService) {}

  @Public()
  @Post('message')
  async receiveMessage(@Body() data: any) {
    const { messages, conversation_id, language_code, user_id, participant_id } = data;
    for (const message of messages ?? []) {
      if (message.role === 'user') {
        message.senderId = user_id;
      } else {
        message.senderId = participant_id;
      }
      await this.messageService.create({
        conversationId: conversation_id,
        content: message.content,
        languageCode: language_code,
        extraMetadata: {},
        senderId: message.senderId || '',
      });
    }
  }
}
