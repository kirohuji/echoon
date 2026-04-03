import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { DocumentWordTimestamp } from './document-audio.types';

const NANOSECONDS_PER_SECOND = 1_000_000_000;

type WhisperVerboseWord = {
  word?: string;
  start?: number;
  end?: number;
};

type WhisperVerboseSegment = {
  words?: WhisperVerboseWord[];
};

type WhisperVerboseJson = {
  error?: string;
  segments?: WhisperVerboseSegment[];
};

function flattenVerboseJsonToWordTimestamps(data: WhisperVerboseJson): DocumentWordTimestamp[] {
  const out: DocumentWordTimestamp[] = [];
  if (!Array.isArray(data?.segments)) return out;

  for (const seg of data.segments) {
    if (!Array.isArray(seg?.words)) continue;
    for (const w of seg.words) {
      const text = typeof w.word === 'string' ? w.word.trim() : '';
      if (!text) continue;
      const startSec = w.start;
      if (typeof startSec !== 'number' || Number.isNaN(startSec)) continue;
      const endSec = w.end;
      out.push({
        text,
        start_time: Math.floor(startSec * NANOSECONDS_PER_SECOND),
        end_time:
          typeof endSec === 'number' && !Number.isNaN(endSec)
            ? Math.floor(endSec * NANOSECONDS_PER_SECOND)
            : undefined,
      });
    }
  }

  out.sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0));
  return out;
}

@Injectable()
export class WhisperTranscriptionService {
  /**
   * 未配置 WHISPER_INFERENCE_URL 时返回 null；推理失败时记录日志并返回 null，不抛错。
   */
  async transcribeFileToWordTimestamps(audioPath: string): Promise<DocumentWordTimestamp[] | null> {
    const url = process.env.WHISPER_INFERENCE_URL?.trim();
    if (!url) return null;

    const timeoutRaw = process.env.WHISPER_TIMEOUT_MS?.trim();
    const timeoutMs =
      timeoutRaw && !Number.isNaN(Number(timeoutRaw)) ? Number(timeoutRaw) : 600_000;

    const language = process.env.WHISPER_LANGUAGE?.trim();
    const splitOnWord = process.env.WHISPER_SPLIT_ON_WORD?.trim().toLowerCase() === 'true';

    try {
      const buf = await readFile(audioPath);
      const form = new FormData();
      form.append('file', new Blob([buf]), basename(audioPath));
      form.append('response_format', 'verbose_json');
      form.append('temperature', '0.0');
      if (language) {
        form.append('language', language);
      }
      if (splitOnWord) {
        form.append('split_on_word', 'true');
      }

      const { data } = await axios.post<WhisperVerboseJson>(url, form, {
        timeout: timeoutMs,
        validateStatus: (s) => s >= 200 && s < 300,
      });

      if (data && typeof data === 'object' && typeof data.error === 'string' && data.error) {
        // eslint-disable-next-line no-console
        console.error('Whisper inference error:', data.error);
        return null;
      }

      const words = flattenVerboseJsonToWordTimestamps(data);
      return words.length ? words : null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Whisper transcription failed', error);
      return null;
    }
  }
}
