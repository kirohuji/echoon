import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(WhisperTranscriptionService.name);

  /**
   * 未配置 WHISPER_INFERENCE_URL 时返回 null；推理失败时记录日志并返回 null，不抛错。
   */
  async transcribeFileToWordTimestamps(
    audioPath: string,
    options?: { temperature?: number }
  ): Promise<DocumentWordTimestamp[] | null> {
    const url = process.env.WHISPER_INFERENCE_URL?.trim();
    if (!url) return null;

    const timeoutRaw = process.env.WHISPER_TIMEOUT_MS?.trim();
    const timeoutMs =
      timeoutRaw && !Number.isNaN(Number(timeoutRaw)) ? Number(timeoutRaw) : 600_000;
    const envTemperatureRaw = process.env.WHISPER_TEMPERATURE?.trim();
    const envTemperature =
      envTemperatureRaw && !Number.isNaN(Number(envTemperatureRaw))
        ? Number(envTemperatureRaw)
        : 0.2;
    const temperature =
      typeof options?.temperature === 'number' && Number.isFinite(options.temperature)
        ? options.temperature
        : envTemperature;

    const language = process.env.WHISPER_LANGUAGE?.trim();
    const splitOnWord = process.env.WHISPER_SPLIT_ON_WORD?.trim().toLowerCase() === 'true';

    const fileLabel = basename(audioPath);

    try {
      const buf = await readFile(audioPath);
      this.logger.log(
        `Whisper-server: 开始转写 file=${fileLabel} bytes=${buf.length} url=${url} language=${language ?? '(auto)'} split_on_word=${splitOnWord} timeoutMs=${timeoutMs}`
      );

      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(buf)]), fileLabel);
      form.append('response_format', 'verbose_json');
      form.append('temperature', String(temperature));
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
        this.logger.warn(`Whisper-server: 接口返回 error file=${fileLabel} message=${data.error}`);
        return null;
      }

      const words = flattenVerboseJsonToWordTimestamps(data);
      const segCount = Array.isArray(data?.segments) ? data.segments.length : 0;
      if (words.length) {
        this.logger.log(
          `Whisper-server: 转写完成 file=${fileLabel} words=${words.length} segments=${segCount}`
        );
        return words;
      }
      this.logger.warn(
        `Whisper-server: 无有效词时间戳 file=${fileLabel} segments=${segCount}（verbose_json 可能无 words 或全被过滤）`
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `Whisper-server: 请求失败 file=${fileLabel} ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
}
