import { AudioProvider } from '@prisma/client';
import { DocumentAudioConfig, CreateDocumentAudioConfigInput } from './document-audio.types';

type ProviderOption = {
  label: string;
  model: string;
  voiceId: string | null;
};

export const DOCUMENT_AUDIO_PROVIDER_OPTIONS: Record<AudioProvider, ProviderOption[]> = {
  minimax: [
    { label: 'speech-2.8-hd', model: 'speech-2.8-hd', voiceId: null },
    { label: 'speech-2.8-turbo', model: 'speech-2.8-turbo', voiceId: null },
    { label: 'speech-2.6-hd', model: 'speech-2.6-hd', voiceId: null },
    { label: 'speech-2.6-turbo', model: 'speech-2.6-turbo', voiceId: null },
    { label: 'speech-02-hd', model: 'speech-02-hd', voiceId: null },
    { label: 'speech-02-turbo', model: 'speech-02-turbo', voiceId: null },
    { label: 'speech-01-hd', model: 'speech-01-hd', voiceId: null },
    { label: 'speech-01-turbo', model: 'speech-01-turbo', voiceId: null },
  ],
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
