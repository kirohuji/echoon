import { Controller, SetMetadata } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DocumentService } from './document.service';

// 自定义 Public 装饰器，用于跳过认证
export const Public = () => SetMetadata('isPublic', true);

@Controller('public/document')
export class PublicDocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Public()
  @EventPattern('document')
  async receiveDocument(@Payload() data: any) {
    const { fileUrl, wordTimestamps, content, userId } = data;
    
    try {
      await this.documentService.create({
        userId: userId,
        fileUrl: fileUrl,
        wordTimestamps: wordTimestamps,
        title: "语音转文档", 
        content: content, 
        createdBy: userId, 
        updatedBy: userId,
      });
    } catch (error) {
      console.error('创建文档失败:', error);
      throw error;
    }
  }
}
