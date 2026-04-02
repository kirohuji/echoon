import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentAudioProviderFactory } from './document-audio-provider.factory';
import { DocumentLibraryService } from './document-library.service';
import { CartesiaDocumentAudioProvider } from './providers/cartesia-document-audio.provider';
import { DeepgramDocumentAudioProvider } from './providers/deepgram-document-audio.provider';
import { ElevenLabsDocumentAudioProvider } from './providers/elevenlabs-document-audio.provider';
import { HumeDocumentAudioProvider } from './providers/hume-document-audio.provider';
import { MinimaxDocumentAudioProvider } from './providers/minimax-document-audio.provider';

@Module({
  imports: [PrismaModule.forRoot({ isGlobal: true })],
  controllers: [DocumentLibraryController],
  providers: [
    DocumentLibraryService,
    DocumentAudioProviderFactory,
    MinimaxDocumentAudioProvider,
    CartesiaDocumentAudioProvider,
    HumeDocumentAudioProvider,
    ElevenLabsDocumentAudioProvider,
    DeepgramDocumentAudioProvider,
  ],
  exports: [DocumentLibraryService],
})
export class DocumentLibraryModule {}
