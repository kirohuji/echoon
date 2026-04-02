import { Service } from './base';

type AudioConfigPayload = {
  audioModel?: string;
  audioProvider?: 'minimax' | 'cartesia' | 'hume' | 'elevenlabs' | 'deepgram';
  audioVoiceId?: string;
  modelName?: string;
};

export type AudioParamsSchemaField = {
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

export type AudioParamsSchemaModel = {
  model: string;
  label: string;
  requiresVoiceId: boolean;
  fields: AudioParamsSchemaField[];
};

export type AudioParamsSchema = {
  provider: 'minimax' | 'cartesia' | 'hume' | 'elevenlabs' | 'deepgram';
  models: AudioParamsSchemaModel[];
};

type GenerateAudioFromTextPayload = {
  text: string;
  audioProvider?: 'minimax' | 'cartesia' | 'hume' | 'elevenlabs' | 'deepgram';
  audioModel?: string;
  audioVoiceId?: string;
  params?: Record<string, string | number | boolean>;
};

export default class DocumentLibraryService extends Service {
  upload(formData: FormData) {
    return this.api.post(`${this.model}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  createText(data: { title?: string; tagIds?: string[]; text: string } & AudioConfigPayload) {
    return this.api.post(`${this.model}/create-text`, data);
  }

  generateAudio(id: string) {
    return this.api.post(`${this.model}/${id}/generate-audio`);
  }

  generateAudioFromText(id: string, payload: GenerateAudioFromTextPayload) {
    return this.api.post(`${this.model}/${id}/generate-audio-text`, payload);
  }

  generateTranslation(id: string) {
    return this.api.post(`${this.model}/${id}/generate-translation`);
  }

  getAudioParamsSchema() {
    return this.api.get(`${this.model}/audio-params-schema`) as Promise<AudioParamsSchema[]>;
  }

  getAudioBlob(id: string) {
    return this.api.get(`${this.model}/${id}/audio`, { responseType: 'blob' });
  }
}
