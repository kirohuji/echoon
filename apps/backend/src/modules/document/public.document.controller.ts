import { Body, Controller, Post, SetMetadata } from '@nestjs/common';
import { DocumentService } from './document.service';

// 自定义 Public 装饰器，用于跳过认证
export const Public = () => SetMetadata('isPublic', true);

/** 原 RabbitMQ EventPattern('document') 改为 HTTP，供其它服务回调 */
@Controller('public/document')
export class PublicDocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Public()
  @Post('ingest')
  async receiveDocument(@Body() data: any) {
    const { fileUrl, wordTimestamps, content, userId } = data;

    await this.documentService.create({
      userId: userId,
      fileUrl: fileUrl,
      wordTimestamps: wordTimestamps,
      title: '语音转文档',
      content: content,
      createdBy: userId,
      updatedBy: userId,
    });
  }
}
