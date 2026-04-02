import { AudioProvider } from '@prisma/client';
import { GenerateDocumentAudioInput, GenerateDocumentAudioResult } from '../document-audio.types';

export abstract class DocumentAudioProvider {
  abstract readonly provider: AudioProvider;

  abstract generateAudio(input: GenerateDocumentAudioInput): Promise<GenerateDocumentAudioResult>;
}
