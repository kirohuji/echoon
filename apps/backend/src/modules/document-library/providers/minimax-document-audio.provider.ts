import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import axios from 'axios';
import { DocumentAudioProvider } from './document-audio-provider';
import { GenerateDocumentAudioInput, GenerateDocumentAudioResult } from '../document-audio.types';

@Injectable()
export class MinimaxDocumentAudioProvider extends DocumentAudioProvider {
  readonly provider = AudioProvider.minimax;

  private guessVoiceId(text: string): string {
    const hasCJK = /[\u4E00-\u9FFF]/.test(text);
    return hasCJK ? 'female-chengshu' : 'English_expressive_narrator';
  }

  async generateAudio(input: GenerateDocumentAudioInput): Promise<GenerateDocumentAudioResult> {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY is not set');
    }

    const transcript = input.text.length > 10000 ? input.text.slice(0, 10000) : input.text;
    const voiceId = input.voiceId || this.guessVoiceId(transcript);

    const res = await axios.post(
      'https://api.minimaxi.com/v1/t2a_v2',
      {
        model: input.model,
        text: transcript,
        stream: false,
        language_boost: 'auto',
        output_format: 'hex',
        voice_setting: {
          voice_id: voiceId,
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          format: 'mp3',
          sample_rate: 32000,
          bitrate: 128000,
          channel: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 180000,
      }
    );

    const baseResp = res?.data?.base_resp as
      | { status_code?: number; status_msg?: string }
      | undefined;
    const traceId = res?.data?.trace_id as string | undefined;
    const statusCode = baseResp?.status_code;
    const statusMsg = baseResp?.status_msg;
    const audioHex = res?.data?.data?.audio as string | undefined;

    if (statusCode !== 0) {
      throw new Error(
        `minimax t2a_v2 failed: status_code=${statusCode ?? 'unknown'}, status_msg=${statusMsg ?? 'unknown'}${traceId ? `, trace_id=${traceId}` : ''}`
      );
    }

    if (!audioHex) {
      throw new Error(`minimax response contains empty audio${traceId ? `, trace_id=${traceId}` : ''}`);
    }

    return {
      audioBuffer: Buffer.from(audioHex, 'hex'),
      fileExtension: 'mp3',
      mimeType: 'audio/mpeg',
      wordTimestamps: null,
      providerMeta: { traceId, voiceId },
    };
  }
}
