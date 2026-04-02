import { Injectable } from '@nestjs/common';
import { AudioProvider } from '@prisma/client';
import { WebSocket } from 'ws';
import { DocumentAudioProvider } from './document-audio-provider';
import { GenerateDocumentAudioInput, GenerateDocumentAudioResult, DocumentWordTimestamp } from '../document-audio.types';

type CartesiaTimestampPayload = {
  words?: string[];
  start?: number[];
  end?: number[];
};

type CartesiaWebsocketEvent = {
  type?: string;
  done?: boolean;
  data?: string;
  audio?: string;
  word_timestamps?: CartesiaTimestampPayload;
  error?: string;
  message?: string;
  request_id?: string;
};

const CARTESIA_VERSION = '2026-04-02';
const NANOSECONDS_PER_SECOND = 1_000_000_000;

function sanitizeContextId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '-');
}

function pcmFloat32LeToWav(audioBuffer: Buffer, sampleRate: number, channels: number) {
  const bitsPerSample = 32;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + audioBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(audioBuffer.length, 40);

  return Buffer.concat([header, audioBuffer]);
}

function normalizeWordTimestamps(payload?: CartesiaTimestampPayload): DocumentWordTimestamp[] | null {
  if (!payload?.words?.length || !payload.start?.length) return null;

  return payload.words.map((word, index) => ({
    text: word,
    start_time: Math.floor((payload.start?.[index] ?? 0) * NANOSECONDS_PER_SECOND),
    end_time:
      payload.end?.[index] !== undefined
        ? Math.floor((payload.end[index] ?? 0) * NANOSECONDS_PER_SECOND)
        : undefined,
  }));
}

@Injectable()
export class CartesiaDocumentAudioProvider extends DocumentAudioProvider {
  readonly provider = AudioProvider.cartesia;

  async generateAudio(input: GenerateDocumentAudioInput): Promise<GenerateDocumentAudioResult> {
    const apiKey =
      process.env.CARTESIA_API_KEY?.trim() || process.env.CARTERSIA_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('CARTESIA_API_KEY is not set');
    }
    if (!input.voiceId) {
      throw new Error('Cartesia voiceId is required');
    }

    const url = `wss://api.cartesia.ai/tts/websocket?api_key=${encodeURIComponent(apiKey)}&cartesia_version=${encodeURIComponent(CARTESIA_VERSION)}`;
    const sampleRate = 44100;

    return new Promise<GenerateDocumentAudioResult>((resolve, reject) => {
      const websocket = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Cartesia-Version': CARTESIA_VERSION,
        },
      });

      const audioChunks: Buffer[] = [];
      // Cartesia 会多次下发 `timestamps` 事件；每次事件可能只包含部分/单个词。
      // 如果这里覆盖会导致最终只剩最后一个词。
      let wordTimestamps: DocumentWordTimestamp[] = [];
      const wordTimestampKeySet = new Set<string>();
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        websocket.close();
        reject(error);
      };

      websocket.on('open', () => {
        websocket.send(
          JSON.stringify({
            model_id: input.model,
            context_id: sanitizeContextId(input.id),
            transcript: input.text,
            voice: { mode: 'id', id: input.voiceId },
            output_format: {
              container: 'raw',
              encoding: 'pcm_f32le',
              sample_rate: sampleRate,
            },
            add_timestamps: true,
          })
        );
      });

      websocket.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as CartesiaWebsocketEvent;

          if (message.type === 'chunk') {
            const audioBase64 = message.data || message.audio;
            if (audioBase64) {
              audioChunks.push(Buffer.from(audioBase64, 'base64'));
            }
            return;
          }

          if (message.type === 'timestamps') {
            const normalized = normalizeWordTimestamps(message.word_timestamps);
            if (normalized) {
              for (const item of normalized) {
                const key = `${item.text}|${item.start_time}|${item.end_time ?? ''}`;
                if (wordTimestampKeySet.has(key)) continue;
                wordTimestampKeySet.add(key);
                wordTimestamps.push(item);
              }
            }
            return;
          }

          if (message.type === 'error') {
            fail(new Error(message.message || message.error || 'Cartesia websocket error'));
            return;
          }

          if (message.type === 'done' || message.done) {
            if (settled) return;
            settled = true;
            websocket.close();

            const pcmBuffer = Buffer.concat(audioChunks);
            if (!pcmBuffer.length) {
              reject(new Error('Cartesia response contains empty audio'));
              return;
            }

            // 前端会对 `wordTimestamps` 做二分搜索，要求 start_time 升序。
            wordTimestamps.sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0));

            resolve({
              audioBuffer: pcmFloat32LeToWav(pcmBuffer, sampleRate, 1),
              fileExtension: 'wav',
              mimeType: 'audio/wav',
              wordTimestamps: wordTimestamps.length ? wordTimestamps : null,
              providerMeta: { requestId: message.request_id, voiceId: input.voiceId },
            });
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error('Failed to parse Cartesia websocket response'));
        }
      });

      websocket.on('error', (error) => {
        fail(error instanceof Error ? error : new Error('Cartesia websocket failed'));
      });

      websocket.on('close', () => {
        if (!settled) {
          fail(new Error('Cartesia websocket closed before completion'));
        }
      });
    });
  }
}
