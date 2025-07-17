import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  imports: [
    PrismaModule.forRoot({ isGlobal: true }),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,  
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
