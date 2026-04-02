import { AudioProvider } from '@prisma/client';

export type DocumentWordTimestamp = {
  text: string;
  start_time: number;
  end_time?: number;
};

export type CreateDocumentAudioConfigInput = {
  provider?: AudioProvider | null;
  model?: string | null;
  voiceId?: string | null;
  legacyModelName?: string | null;
};

export type DocumentAudioConfig = {
  provider: AudioProvider;
  model: string;
  voiceId: string | null;
  legacyModelName: string;
};

export type GenerateDocumentAudioInput = {
  id: string;
  text: string;
  model: string;
  voiceId?: string | null;
};

export type GenerateDocumentAudioResult = {
  audioBuffer: Buffer;
  fileExtension: 'mp3' | 'wav';
  mimeType: string;
  wordTimestamps: DocumentWordTimestamp[] | null;
  providerMeta?: Record<string, unknown>;
};
