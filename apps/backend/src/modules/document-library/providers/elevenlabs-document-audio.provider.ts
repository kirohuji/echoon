import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import axios from 'axios';
import { DocumentAudioProvider } from './document-audio-provider';
import { GenerateDocumentAudioInput, GenerateDocumentAudioResult } from '../document-audio.types';

@Injectable()
export class ElevenLabsDocumentAudioProvider extends DocumentAudioProvider {
  readonly provider = AudioProvider.elevenlabs;

  async generateAudio(input: GenerateDocumentAudioInput): Promise<GenerateDocumentAudioResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }
    if (!input.voiceId) {
      throw new Error('ElevenLabs voiceId is required');
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}`,
      {
        text: input.text,
        model_id: input.model,
        voice_settings: {
          stability: typeof input.params?.stability === 'number' ? input.params.stability : 0.5,
          similarity_boost: typeof input.params?.similarityBoost === 'number' ? input.params.similarityBoost : 0.75,
          style: typeof input.params?.style === 'number' ? input.params.style : 0,
          use_speaker_boost: Boolean(input.params?.speakerBoost),
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 180000,
      }
    );

    return {
      audioBuffer: Buffer.from(response.data),
      fileExtension: 'mp3',
      mimeType: 'audio/mpeg',
      wordTimestamps: null,
    };
  }
}
