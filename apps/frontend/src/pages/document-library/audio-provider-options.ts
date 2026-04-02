export type AudioProvider = 'minimax' | 'cartesia' | 'hume' | 'elevenlabs' | 'deepgram';

export type AudioProviderOption = {
  provider: AudioProvider;
  label: string;
  model: string;
  voiceId?: string;
  voiceLabel?: string;
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

const MINIMAX_MODELS_WITH_ENGLISH_VOICE_PICKER = new Set(['speech-2.8-hd', 'speech-2.8-turbo']);

function buildMinimaxAudioProviderOptions(): AudioProviderOption[] {
  const rows: AudioProviderOption[] = [];
  for (const model of MINIMAX_SPEECH_MODELS) {
    rows.push({
      provider: 'minimax',
      label: `${model} · 自动（按文本推断）`,
      model,
      voiceLabel: '自动（按文本推断）',
    });
  }
  for (const model of MINIMAX_SPEECH_MODELS) {
    if (!MINIMAX_MODELS_WITH_ENGLISH_VOICE_PICKER.has(model)) continue;
    for (const v of MINIMAX_ENGLISH_SYSTEM_VOICES) {
      rows.push({
        provider: 'minimax',
        label: `${model} · ${v.label}`,
        model,
        voiceId: v.voiceId,
        voiceLabel: v.label,
      });
    }
  }
  return rows;
}

export const DOCUMENT_AUDIO_PROVIDER_OPTIONS: Record<AudioProvider, AudioProviderOption[]> = {
  minimax: buildMinimaxAudioProviderOptions(),
  cartesia: [
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Leo',
      model: 'sonic-3',
      voiceId: '0834f3df-e650-4766-a20c-5a93a43aa6e3',
      voiceLabel: 'Leo',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Jace',
      model: 'sonic-3',
      voiceId: '6776173b-fd72-460d-89b3-d85812ee518d',
      voiceLabel: 'Jace',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Kyle',
      model: 'sonic-3',
      voiceId: 'c961b81c-a935-4c17-bfb3-ba2239de8c2f',
      voiceLabel: 'Kyle',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Gavin',
      model: 'sonic-3',
      voiceId: 'f4a3a8e4-694c-4c45-9ca0-27caf97901b5',
      voiceLabel: 'Gavin',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Maya',
      model: 'sonic-3',
      voiceId: 'cbaf8084-f009-4838-a096-07ee2e6612b1',
      voiceLabel: 'Maya',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Tessa',
      model: 'sonic-3',
      voiceId: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
      voiceLabel: 'Tessa',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Dana',
      model: 'sonic-3',
      voiceId: 'cc00e582-ed66-4004-8336-0175b85c85f6',
      voiceLabel: 'Dana',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Marian',
      model: 'sonic-3',
      voiceId: '26403c37-80c1-4a1a-8692-540551ca2ae5',
      voiceLabel: 'Marian',
    },
  ],
  hume: [
    { provider: 'hume', label: 'Octave TTS', model: 'octave-tts' },
    { provider: 'hume', label: 'Octave TTS 2', model: 'octave-tts-v2' },
  ],
  elevenlabs: [
    {
      provider: 'elevenlabs',
      label: 'Eleven v3 / Rachel',
      model: 'eleven_v3',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      voiceLabel: 'Rachel',
    },
    {
      provider: 'elevenlabs',
      label: 'Eleven v3 / George',
      model: 'eleven_v3',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      voiceLabel: 'George',
    },
    {
      provider: 'elevenlabs',
      label: 'Eleven Multilingual v2 / George',
      model: 'eleven_multilingual_v2',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      voiceLabel: 'George',
    },
    {
      provider: 'elevenlabs',
      label: 'Eleven Flash v2.5 / George',
      model: 'eleven_flash_v2_5',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      voiceLabel: 'George',
    },
  ],
  deepgram: [
    { provider: 'deepgram', label: 'Aura-2 Thalia', model: 'aura-2-thalia-en' },
    { provider: 'deepgram', label: 'Aura-2 Asteria', model: 'aura-2-asteria-en' },
  ],
};
