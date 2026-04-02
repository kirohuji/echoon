import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentAudioProviderFactory } from './document-audio-provider.factory';
import { DocumentLibraryService } from './document-library.service';
import { CartesiaDocumentAudioProvider } from './providers/cartesia-document-audio.provider';
import { MinimaxDocumentAudioProvider } from './providers/minimax-document-audio.provider';

@Module({
  imports: [PrismaModule.forRoot({ isGlobal: true })],
  controllers: [DocumentLibraryController],
  providers: [
    DocumentLibraryService,
    DocumentAudioProviderFactory,
    MinimaxDocumentAudioProvider,
    CartesiaDocumentAudioProvider,
  ],
  exports: [DocumentLibraryService],
})
export class DocumentLibraryModule {}
