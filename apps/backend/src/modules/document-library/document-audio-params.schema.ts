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

export const DOCUMENT_AUDIO_PARAMS_SCHEMA: DocumentAudioParamsSchema[] = [
  { provider: AudioProvider.minimax, models: MINIMAX_MODELS },
  { provider: AudioProvider.cartesia, models: CARTESIA_MODELS },
];

function toNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
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
    if (field.type === 'boolean' && typeof rawValue === 'boolean') {
      result[field.key] = rawValue;
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
