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
      label: 'Sonic 3 / Story Narrator',
      model: 'sonic-3',
      voiceId: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
    },
    {
      label: 'Sonic 3 / Warm Narrator',
      model: 'sonic-3',
      voiceId: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
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
