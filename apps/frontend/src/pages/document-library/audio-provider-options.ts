export type AudioProvider = 'minimax' | 'cartesia';

export type AudioProviderOption = {
  provider: AudioProvider;
  label: string;
  model: string;
  voiceId?: string;
  voiceLabel?: string;
};

export const DOCUMENT_AUDIO_PROVIDER_OPTIONS: Record<AudioProvider, AudioProviderOption[]> = {
  minimax: [
    { provider: 'minimax', label: 'speech-2.8-hd', model: 'speech-2.8-hd' },
    { provider: 'minimax', label: 'speech-2.8-turbo', model: 'speech-2.8-turbo' },
    { provider: 'minimax', label: 'speech-2.6-hd', model: 'speech-2.6-hd' },
    { provider: 'minimax', label: 'speech-2.6-turbo', model: 'speech-2.6-turbo' },
    { provider: 'minimax', label: 'speech-02-hd', model: 'speech-02-hd' },
    { provider: 'minimax', label: 'speech-02-turbo', model: 'speech-02-turbo' },
    { provider: 'minimax', label: 'speech-01-hd', model: 'speech-01-hd' },
    { provider: 'minimax', label: 'speech-01-turbo', model: 'speech-01-turbo' },
  ],
  cartesia: [
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Story Narrator',
      model: 'sonic-3',
      voiceId: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
      voiceLabel: 'Story Narrator',
    },
    {
      provider: 'cartesia',
      label: 'Sonic 3 / Warm Narrator',
      model: 'sonic-3',
      voiceId: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
      voiceLabel: 'Warm Narrator',
    },
  ],
};
