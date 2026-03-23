import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentLibraryService } from './document-library.service';

@Module({
  imports: [PrismaModule.forRoot({ isGlobal: true })],
  controllers: [DocumentLibraryController],
  providers: [DocumentLibraryService],
  exports: [DocumentLibraryService],
})
export class DocumentLibraryModule {}
