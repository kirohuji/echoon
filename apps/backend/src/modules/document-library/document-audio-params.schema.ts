import { AudioProvider } from '@prisma/client';
import {
  DocumentAudioParamsSchema,
  DocumentAudioRegenerateOverrides,
  DocumentAudioProviderModelSchema,
} from './document-audio.types';

const MINIMAX_MODEL_OPTIONS = [
  'speech-2.8-hd',
  'speech-2.8-turbo',
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-02-hd',
  'speech-02-turbo',
  'speech-01-hd',
  'speech-01-turbo',
];

const MINIMAX_MODELS: DocumentAudioProviderModelSchema[] = MINIMAX_MODEL_OPTIONS.map((model) => ({
  model,
  label: model,
  requiresVoiceId: false,
  fields: [
    {
      key: 'speed',
      label: '语速',
      type: 'number',
      min: 0.5,
      max: 2,
      step: 0.1,
      defaultValue: 1,
    },
    {
      key: 'pitch',
      label: '音高',
      type: 'number',
      min: -12,
      max: 12,
      step: 0.5,
      defaultValue: 0,
    },
    {
      key: 'vol',
      label: '音量',
      type: 'number',
      min: 0.1,
      max: 2,
      step: 0.1,
      defaultValue: 1,
    },
  ],
}));

const CARTESIA_MODELS: DocumentAudioProviderModelSchema[] = [
  {
    model: 'sonic-3',
    label: 'Sonic 3',
    requiresVoiceId: true,
    fields: [
      {
        key: 'speed',
        label: '语速',
        type: 'number',
        min: 0.6,
        max: 1.5,
        step: 0.1,
        defaultValue: 1,
      },
      {
        key: 'volume',
        label: '音量',
        type: 'number',
        min: 0.5,
        max: 2,
        step: 0.1,
        defaultValue: 1,
      },
      {
        key: 'emotion',
        label: '情绪',
        type: 'select',
        defaultValue: 'neutral',
        options: [
          { label: 'Neutral', value: 'neutral' },
          { label: 'Excited', value: 'excited' },
          { label: 'Content', value: 'content' },
          { label: 'Sad', value: 'sad' },
          { label: 'Angry', value: 'angry' },
          { label: 'Scared', value: 'scared' },
        ],
      },
    ],
  },
];

const HUME_MODELS: DocumentAudioProviderModelSchema[] = [
  {
    model: 'octave-tts',
    label: 'Octave TTS',
    requiresVoiceId: false,
    fields: [
      {
        key: 'speed',
        label: '语速',
        type: 'number',
        min: 0.5,
        max: 2,
        step: 0.1,
        defaultValue: 1,
      },
      {
        key: 'stability',
        label: '稳定度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
      },
      {
        key: 'style',
        label: '风格强度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.2,
      },
      {
        key: 'sampleRate',
        label: '采样率',
        type: 'select',
        defaultValue: '44100',
        options: [
          { label: '22050', value: '22050' },
          { label: '44100', value: '44100' },
        ],
      },
      {
        key: 'bitrate',
        label: '码率',
        type: 'select',
        defaultValue: '128000',
        options: [
          { label: '64000', value: '64000' },
          { label: '96000', value: '96000' },
          { label: '128000', value: '128000' },
        ],
      },
    ],
  },
  {
    model: 'octave-tts-v2',
    label: 'Octave TTS 2',
    requiresVoiceId: false,
    fields: [
      {
        key: 'speed',
        label: '语速',
        type: 'number',
        min: 0.5,
        max: 2,
        step: 0.1,
        defaultValue: 1,
      },
      {
        key: 'stability',
        label: '稳定度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
      },
      {
        key: 'style',
        label: '风格强度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.3,
      },
    ],
  },
];

const ELEVENLABS_MODELS: DocumentAudioProviderModelSchema[] = [
  {
    model: 'eleven_v3',
    label: 'Eleven v3',
    requiresVoiceId: true,
    fields: [
      {
        key: 'stability',
        label: '稳定度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
      },
      {
        key: 'similarityBoost',
        label: '相似度增强',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.75,
      },
      {
        key: 'style',
        label: '风格强度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0,
      },
      {
        key: 'speakerBoost',
        label: '说话人增强',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    model: 'eleven_multilingual_v2',
    label: 'Eleven Multilingual v2',
    requiresVoiceId: true,
    fields: [
      {
        key: 'stability',
        label: '稳定度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
      },
      {
        key: 'similarityBoost',
        label: '相似度增强',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.75,
      },
      {
        key: 'speakerBoost',
        label: '说话人增强',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    model: 'eleven_flash_v2_5',
    label: 'Eleven Flash v2.5',
    requiresVoiceId: true,
    fields: [
      {
        key: 'stability',
        label: '稳定度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.4,
      },
      {
        key: 'similarityBoost',
        label: '相似度增强',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.7,
      },
    ],
  },
];

const DEEPGRAM_MODELS: DocumentAudioProviderModelSchema[] = [
  {
    model: 'aura-2-thalia-en',
    label: 'Aura-2 Thalia',
    requiresVoiceId: false,
    fields: [
      {
        key: 'encoding',
        label: '编码格式',
        type: 'select',
        defaultValue: 'mp3',
        options: [
          { label: 'mp3', value: 'mp3' },
          { label: 'wav', value: 'wav' },
          { label: 'linear16', value: 'linear16' },
        ],
      },
      {
        key: 'sampleRate',
        label: '采样率',
        type: 'select',
        defaultValue: '24000',
        options: [
          { label: '16000', value: '16000' },
          { label: '24000', value: '24000' },
          { label: '48000', value: '48000' },
        ],
      },
    ],
  },
  {
    model: 'aura-2-asteria-en',
    label: 'Aura-2 Asteria',
    requiresVoiceId: false,
    fields: [
      {
        key: 'encoding',
        label: '编码格式',
        type: 'select',
        defaultValue: 'mp3',
        options: [
          { label: 'mp3', value: 'mp3' },
          { label: 'wav', value: 'wav' },
        ],
      },
      {
        key: 'sampleRate',
        label: '采样率',
        type: 'select',
        defaultValue: '24000',
        options: [
          { label: '16000', value: '16000' },
          { label: '24000', value: '24000' },
          { label: '48000', value: '48000' },
        ],
      },
    ],
  },
];

export const DOCUMENT_AUDIO_PARAMS_SCHEMA: DocumentAudioParamsSchema[] = [
  { provider: AudioProvider.minimax, models: MINIMAX_MODELS },
  { provider: AudioProvider.cartesia, models: CARTESIA_MODELS },
  { provider: AudioProvider.hume, models: HUME_MODELS },
  { provider: AudioProvider.elevenlabs, models: ELEVENLABS_MODELS },
  { provider: AudioProvider.deepgram, models: DEEPGRAM_MODELS },
];

function toNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function toBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;
  }
  return undefined;
}

export function sanitizeRegenerateAudioParams(
  provider: AudioProvider,
  model: string,
  params?: Record<string, unknown>
) {
  if (!params) return {};
  const providerSchema = DOCUMENT_AUDIO_PARAMS_SCHEMA.find((item) => item.provider === provider);
  const modelSchema = providerSchema?.models.find((item) => item.model === model);
  if (!modelSchema) return {};

  const result: Record<string, string | number | boolean> = {};
  for (const field of modelSchema.fields) {
    const rawValue = params[field.key];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    if (field.type === 'number') {
      const parsed = toNumber(rawValue);
      if (parsed === undefined) continue;
      if (field.min !== undefined && parsed < field.min) continue;
      if (field.max !== undefined && parsed > field.max) continue;
      result[field.key] = parsed;
      continue;
    }
    if (field.type === 'boolean') {
      const parsed = toBoolean(rawValue);
      if (parsed === undefined) continue;
      result[field.key] = parsed;
      continue;
    }
    if (field.type === 'select' || field.type === 'string') {
      const value = String(rawValue);
      if (field.type === 'select' && field.options?.length) {
        const allowed = field.options.some((item) => item.value === value);
        if (!allowed) continue;
      }
      result[field.key] = value;
    }
  }
  return result;
}

export function resolveRegenerateOverrides(input: DocumentAudioRegenerateOverrides) {
  return {
    audioProvider: input.audioProvider,
    audioModel: input.audioModel,
    audioVoiceId: input.audioVoiceId,
    params: input.params,
  };
}
