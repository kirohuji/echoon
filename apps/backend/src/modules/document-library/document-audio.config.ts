import { AudioProvider } from '@prisma/client';
import { DocumentAudioConfig, CreateDocumentAudioConfigInput } from './document-audio.types';

type ProviderOption = {
  label: string;
  model: string;
  voiceId: string | null;
};

/** MiniMax 系统音色（英文）：https://platform.minimaxi.com/docs/faq/system-voice-id */
const MINIMAX_ENGLISH_SYSTEM_VOICES: { voiceId: string; label: string }[] = [
  { voiceId: 'Santa_Claus', label: 'Santa Claus' },
  { voiceId: 'Grinch', label: 'Grinch' },
  { voiceId: 'Rudolph', label: 'Rudolph' },
  { voiceId: 'Arnold', label: 'Arnold' },
  { voiceId: 'Charming_Santa', label: 'Charming Santa' },
  { voiceId: 'Charming_Lady', label: 'Charming Lady' },
  { voiceId: 'Sweet_Girl', label: 'Sweet Girl' },
  { voiceId: 'Cute_Elf', label: 'Cute Elf' },
  { voiceId: 'Attractive_Girl', label: 'Attractive Girl' },
  { voiceId: 'Serene_Woman', label: 'Serene Woman' },
  { voiceId: 'English_Trustworthy_Man', label: 'Trustworthy Man' },
  { voiceId: 'English_Graceful_Lady', label: 'Graceful Lady' },
  { voiceId: 'English_Aussie_Bloke', label: 'Aussie Bloke' },
  { voiceId: 'English_Whispering_girl', label: 'Whispering girl' },
  { voiceId: 'English_Diligent_Man', label: 'Diligent Man' },
  { voiceId: 'English_Gentle-voiced_man', label: 'Gentle-voiced man' },
];

const MINIMAX_SPEECH_MODELS = [
  'speech-2.8-hd',
  'speech-2.8-turbo',
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-02-hd',
  'speech-02-turbo',
  'speech-01-hd',
  'speech-01-turbo',
] as const;

const MINIMAX_MODELS_WITH_ENGLISH_VOICE_PICKER = new Set<string>(['speech-2.8-hd', 'speech-2.8-turbo']);

function buildMinimaxProviderOptions(): ProviderOption[] {
  const rows: ProviderOption[] = [];
  for (const model of MINIMAX_SPEECH_MODELS) {
    rows.push({ label: `${model} · 自动（按文本推断）`, model, voiceId: null });
  }
  for (const model of MINIMAX_SPEECH_MODELS) {
    if (!MINIMAX_MODELS_WITH_ENGLISH_VOICE_PICKER.has(model)) continue;
    for (const v of MINIMAX_ENGLISH_SYSTEM_VOICES) {
      rows.push({ label: `${model} · ${v.label}`, model, voiceId: v.voiceId });
    }
  }
  return rows;
}

export const DOCUMENT_AUDIO_PROVIDER_OPTIONS: Record<AudioProvider, ProviderOption[]> = {
  minimax: buildMinimaxProviderOptions(),
  cartesia: [
    {
      label: 'Sonic 3 / Leo',
      model: 'sonic-3',
      voiceId: '0834f3df-e650-4766-a20c-5a93a43aa6e3',
    },
    {
      label: 'Sonic 3 / Jace',
      model: 'sonic-3',
      voiceId: '6776173b-fd72-460d-89b3-d85812ee518d',
    },
    {
      label: 'Sonic 3 / Kyle',
      model: 'sonic-3',
      voiceId: 'c961b81c-a935-4c17-bfb3-ba2239de8c2f',
    },
    {
      label: 'Sonic 3 / Gavin',
      model: 'sonic-3',
      voiceId: 'f4a3a8e4-694c-4c45-9ca0-27caf97901b5',
    },
    {
      label: 'Sonic 3 / Maya',
      model: 'sonic-3',
      voiceId: 'cbaf8084-f009-4838-a096-07ee2e6612b1',
    },
    {
      label: 'Sonic 3 / Tessa',
      model: 'sonic-3',
      voiceId: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
    },
    {
      label: 'Sonic 3 / Dana',
      model: 'sonic-3',
      voiceId: 'cc00e582-ed66-4004-8336-0175b85c85f6',
    },
    {
      label: 'Sonic 3 / Marian',
      model: 'sonic-3',
      voiceId: '26403c37-80c1-4a1a-8692-540551ca2ae5',
    },
  ],
  hume: [
    { label: 'octave-tts', model: 'octave-tts', voiceId: null },
    { label: 'octave-tts-v2', model: 'octave-tts-v2', voiceId: null },
  ],
  elevenlabs: [
    { label: 'eleven_v3', model: 'eleven_v3', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
    { label: 'eleven_multilingual_v2', model: 'eleven_multilingual_v2', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
    { label: 'eleven_flash_v2_5', model: 'eleven_flash_v2_5', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
  ],
  deepgram: [
    { label: 'aura-2-thalia-en', model: 'aura-2-thalia-en', voiceId: null },
    { label: 'aura-2-asteria-en', model: 'aura-2-asteria-en', voiceId: null },
  ],
};

const DEFAULT_PROVIDER = AudioProvider.minimax;

export function resolveDocumentAudioConfig(input: CreateDocumentAudioConfigInput): DocumentAudioConfig {
  const provider = input.provider ?? DEFAULT_PROVIDER;
  const options = DOCUMENT_AUDIO_PROVIDER_OPTIONS[provider];
  const fallbackOption = options[0];
  const matchedOption = options.find(
    (option) => option.model === input.model && (!input.voiceId || option.voiceId === input.voiceId)
  );
  const selectedOption = matchedOption ?? fallbackOption;

  return {
    provider,
    model: input.model || selectedOption.model,
    voiceId: input.voiceId ?? selectedOption.voiceId,
    legacyModelName: input.legacyModelName || input.model || selectedOption.model,
  };
}
