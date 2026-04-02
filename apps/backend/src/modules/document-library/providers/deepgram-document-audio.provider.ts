import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import axios from 'axios';
import { DocumentAudioProvider } from './document-audio-provider';
import { GenerateDocumentAudioInput, GenerateDocumentAudioResult } from '../document-audio.types';

@Injectable()
export class DeepgramDocumentAudioProvider extends DocumentAudioProvider {
  readonly provider = AudioProvider.deepgram;

  async generateAudio(input: GenerateDocumentAudioInput): Promise<GenerateDocumentAudioResult> {
    const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY is not set');
    }

    const response = await axios.post(
      'https://api.deepgram.com/v1/speak',
      {
        text: input.text,
      },
      {
        params: {
          model: input.model,
          ...(input.voiceId ? { voice: input.voiceId } : {}),
          ...(typeof input.params?.encoding === 'string' ? { encoding: input.params.encoding } : {}),
          ...(typeof input.params?.sampleRate === 'number' ? { sample_rate: input.params.sampleRate } : {}),
        },
        headers: {
          Authorization: `Token ${apiKey}`,
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
