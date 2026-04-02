import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import axios from 'axios';
import { DocumentAudioProvider } from './document-audio-provider';
import { GenerateDocumentAudioInput, GenerateDocumentAudioResult } from '../document-audio.types';

@Injectable()
export class HumeDocumentAudioProvider extends DocumentAudioProvider {
  readonly provider = AudioProvider.hume;

  async generateAudio(input: GenerateDocumentAudioInput): Promise<GenerateDocumentAudioResult> {
    const apiKey = process.env.HUME_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('HUME_API_KEY is not set');
    }

    const response = await axios.post(
      'https://api.hume.ai/v0/tts',
      {
        text: input.text,
        voice: {
          id: input.voiceId || undefined,
        },
        model: input.model,
        config: {
          ...(typeof input.params?.speed === 'number' ? { speed: input.params.speed } : {}),
          ...(typeof input.params?.stability === 'number' ? { stability: input.params.stability } : {}),
          ...(typeof input.params?.style === 'number' ? { style: input.params.style } : {}),
        },
        output_format: {
          container: 'mp3',
          sample_rate: typeof input.params?.sampleRate === 'number' ? input.params.sampleRate : 44100,
          bit_rate: typeof input.params?.bitrate === 'number' ? input.params.bitrate : 128000,
        },
      },
      {
        headers: {
          'X-Hume-Api-Key': apiKey,
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
