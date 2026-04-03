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
  return refineWhisperWordFragments(out);
}

/** whisper 词级对齐常把同一英文词切成多段（如 Remo+ving、Re+mo+ving）；在时间间隔极短时按规则并回一条。 */
const MAX_FRAGMENT_MERGE_GAP_NS = 120_000_000;

const NO_MERGE_BEFORE_FRAGMENT = new Set([
  'a',
  'an',
  'the',
  'to',
  'of',
  'in',
  'on',
  'at',
  'is',
  'be',
  'am',
  'are',
  'was',
  'were',
  'it',
  'if',
  'as',
  'by',
  'do',
  'so',
  'we',
  'he',
  'me',
  'my',
  'us',
  'no',
  'go',
  'up',
  'or',
  'this',
  'that',
  'these',
  'those',
  'what',
  'which',
  'who',
  'how',
  'why',
  'can',
  'could',
  'would',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'will',
  'not',
  'but',
  'and',
  'nor',
  'yet',
  'for',
  'with',
  'from',
  'into',
  'onto',
  'about',
  'against',
  'between',
  'through',
  'during',
  'before',
  'after',
]);

function looksLikeEnglishContinuationFragment(lower: string): boolean {
  if (!/^[a-z]+$/.test(lower)) return false;
  if (lower.length < 2) return false;
  if (/^(?:ing|ed|es|ly|er|al|ic|ous|ive|ish|ment|ness|less|ful|tion|sion|ity|ory|ary)$/.test(lower)) {
    return true;
  }
  if (lower.length >= 3 && /^l{1,2}ing$/.test(lower)) return true;
  if (lower.length >= 3 && /^[bcdfghjklmnpqrstvwxyz]ing$/.test(lower)) return true;
  if (lower.length >= 5 && /^[bcdfghjklmnpqrstvwxyz]{2,}[a-z]+$/.test(lower)) return true;
  if (lower.length >= 5 && /^[a-z]{2,}ing$/.test(lower)) return true;
  if (lower.length >= 4 && /^[a-z]{2,}ed$/.test(lower)) return true;
  return false;
}

/** 单次从左到右合并一对；多轮调用可吸收 Re+mo+ving */
function mergeAdjacentWhisperSubwordFragments(words: DocumentWordTimestamp[]): DocumentWordTimestamp[] {
  if (words.length < 2) return words;

  const merged: DocumentWordTimestamp[] = [];
  for (const cur of words) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...cur });
      continue;
    }

    const t1 = prev.text.trim();
    const t2 = cur.text.trim();
    const t1Lower = t1.toLowerCase();
    const endPrev = prev.end_time;
    if (typeof endPrev !== 'number') {
      merged.push({ ...cur });
      continue;
    }

    const gap = (cur.start_time ?? 0) - endPrev;
    const t2Lower = t2.toLowerCase();

    const shouldMerge =
      gap >= 0 &&
      gap <= MAX_FRAGMENT_MERGE_GAP_NS &&
      t1.length >= 2 &&
      !NO_MERGE_BEFORE_FRAGMENT.has(t1Lower) &&
      !/[.!?。！？]$/.test(t1) &&
      looksLikeEnglishContinuationFragment(t2Lower);

    if (shouldMerge) {
      merged[merged.length - 1] = {
        ...prev,
        text: `${t1}${t2}`,
        end_time: cur.end_time ?? prev.end_time,
      };
    } else {
      merged.push({ ...cur });
    }
  }

  return merged;
}

function refineWhisperWordFragments(words: DocumentWordTimestamp[]): DocumentWordTimestamp[] {
  let cur = words;
  for (let pass = 0; pass < 10; pass += 1) {
    const next = mergeAdjacentWhisperSubwordFragments(cur);
    if (next.length === cur.length) break;
    cur = next;
  }
  return cur;
}

@Injectable()
export class WhisperTranscriptionService {
  private readonly logger = new Logger(WhisperTranscriptionService.name);

  /**
   * 未配置 WHISPER_INFERENCE_URL 时返回 null；推理失败时记录日志并返回 null，不抛错。
   */
  async transcribeFileToWordTimestamps(
    audioPath: string,
    options?: { temperature?: number; splitOnWord?: boolean }
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
    const splitOnWordFromEnv = process.env.WHISPER_SPLIT_ON_WORD?.trim().toLowerCase() === 'true';
    const splitOnWord =
      typeof options?.splitOnWord === 'boolean' ? options.splitOnWord : splitOnWordFromEnv;

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
