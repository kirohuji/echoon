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

export type WordLookupDefinition = {
  partOfSpeech: string;
  gloss: string;
  synonyms: string[];
};

export type WordLookupResponse = {
  word: string;
  definitions: WordLookupDefinition[];
};

/** 后端 SuccessResponseInterceptor：`{ success, code, data: T }`；axios 拦截器已返回 response.data。 */
function unwrapEchoonPayload<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { success?: boolean }).success === true) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export function parseWordLookupResponse(raw: unknown): WordLookupResponse | null {
  const inner = unwrapEchoonPayload<unknown>(raw);
  if (!inner || typeof inner !== 'object') {
    return null;
  }
  const obj = inner as { word?: unknown; definitions?: unknown };
  if (!Array.isArray(obj.definitions)) {
    return null;
  }
  return { word: String(obj.word ?? ''), definitions: obj.definitions as WordLookupDefinition[] };
}

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

  lookupWord(word: string) {
    return this.api.get(`${this.model}/word-lookup`, { params: { word } }) as Promise<unknown>;
  }

  /** 按顺序尝试候选（短语 + 单词），单次 POST。返回值需用 parseWordLookupResponse 解析。 */
  lookupWordCandidates(candidates: string[]) {
    return this.api.post(`${this.model}/word-lookup`, { candidates }) as Promise<unknown>;
  }
}
