import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import { DocumentAudioProvider } from './providers/document-audio-provider';
import { CartesiaDocumentAudioProvider } from './providers/cartesia-document-audio.provider';
import { MinimaxDocumentAudioProvider } from './providers/minimax-document-audio.provider';

@Injectable()
export class DocumentAudioProviderFactory {
  constructor(
    private readonly minimaxProvider: MinimaxDocumentAudioProvider,
    private readonly cartesiaProvider: CartesiaDocumentAudioProvider
  ) {}

  getProvider(provider: AudioProvider) {
    switch (provider) {
      case AudioProvider.cartesia:
        return this.cartesiaProvider;
      case AudioProvider.minimax:
      default:
        return this.minimaxProvider;
    }
  }

  getProviders(): DocumentAudioProvider[] {
    return [this.minimaxProvider, this.cartesiaProvider];
  }
}
