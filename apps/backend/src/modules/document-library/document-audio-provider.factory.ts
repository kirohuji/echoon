import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import { DocumentAudioProvider } from './providers/document-audio-provider';
import { CartesiaDocumentAudioProvider } from './providers/cartesia-document-audio.provider';
import { DeepgramDocumentAudioProvider } from './providers/deepgram-document-audio.provider';
import { ElevenLabsDocumentAudioProvider } from './providers/elevenlabs-document-audio.provider';
import { HumeDocumentAudioProvider } from './providers/hume-document-audio.provider';
import { MinimaxDocumentAudioProvider } from './providers/minimax-document-audio.provider';

@Injectable()
export class DocumentAudioProviderFactory {
  constructor(
    private readonly minimaxProvider: MinimaxDocumentAudioProvider,
    private readonly cartesiaProvider: CartesiaDocumentAudioProvider,
    private readonly humeProvider: HumeDocumentAudioProvider,
    private readonly elevenLabsProvider: ElevenLabsDocumentAudioProvider,
    private readonly deepgramProvider: DeepgramDocumentAudioProvider,
  ) {}

  getProvider(provider: AudioProvider) {
    switch (provider) {
      case AudioProvider.cartesia:
        return this.cartesiaProvider;
      case AudioProvider.hume:
        return this.humeProvider;
      case AudioProvider.elevenlabs:
        return this.elevenLabsProvider;
      case AudioProvider.deepgram:
        return this.deepgramProvider;
      case AudioProvider.minimax:
      default:
        return this.minimaxProvider;
    }
  }

  getProviders(): DocumentAudioProvider[] {
    return [
      this.minimaxProvider,
      this.cartesiaProvider,
      this.humeProvider,
      this.elevenLabsProvider,
      this.deepgramProvider,
    ];
  }
}
