import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { PublicDocumentController } from './public.document.controller'

@Module({
  imports: [
    PrismaModule.forRoot({ isGlobal: true }),
  ],
  controllers: [DocumentController, PublicDocumentController],
  providers: [
    DocumentService,  
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
