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
};
