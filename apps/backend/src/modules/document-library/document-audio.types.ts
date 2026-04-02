import { AudioProvider } from '@prisma/client';

export type DocumentWordTimestamp = {
  text: string;
  start_time: number;
  end_time?: number;
  sentenceIndex?: number;
  sentenceText?: string;
  sentenceZh?: string;
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
  params?: Record<string, unknown>;
};

export type GenerateDocumentAudioResult = {
  audioBuffer: Buffer;
  fileExtension: 'mp3' | 'wav';
  mimeType: string;
  wordTimestamps: DocumentWordTimestamp[] | null;
  providerMeta?: Record<string, unknown>;
};

export type DocumentAudioParamSchemaField = {
  key: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'boolean';
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  helpText?: string;
};

export type DocumentAudioProviderModelSchema = {
  model: string;
  label: string;
  requiresVoiceId: boolean;
  fields: DocumentAudioParamSchemaField[];
};

export type DocumentAudioParamsSchema = {
  provider: AudioProvider;
  models: DocumentAudioProviderModelSchema[];
};

export type DocumentAudioRegenerateOverrides = {
  audioProvider?: AudioProvider;
  audioModel?: string;
  audioVoiceId?: string;
  params?: Record<string, unknown>;
};
