#!/usr/bin/env node
/**
 * 探测 whisper-server：/health + 上传 test.mp3 调用 /inference（verbose_json）。
 *
 * 用法：
 *   node test-inference.mjs
 *   node test-inference.mjs http://127.0.0.1:2610
 *   WHISPER_TEST_BASE=http://... node test-inference.mjs
 *   WHISPER_TEST_AUDIO=/path/to/other.mp3 node test-inference.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseArg = process.argv[2]?.replace(/\/$/, '');
const base = (
  process.env.WHISPER_TEST_BASE ||
  baseArg ||
  'http://115.159.95.166:2610'
).replace(/\/$/, '');

const audioPath = process.env.WHISPER_TEST_AUDIO || join(__dirname, 'test.mp3');

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify({ error: 'Failed to stringify result' }, null, 2);
  }
}

function writeTempOutput(payload) {
  const outDir = join(__dirname, 'tmp');
  mkdirSync(outDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `test-inference-result-${ts}`;

  const jsonPath = join(outDir, `${baseName}.json`);
  const txtPath = join(outDir, `${baseName}.txt`);

  writeFileSync(jsonPath, safeJsonStringify(payload), 'utf8');
  const summary =
    typeof payload?.text === 'string'
      ? `text:\n${payload.text}\n\n`
      : '';
  const segmentsSummary = Array.isArray(payload?.segments)
    ? payload.segments
        .slice(0, 10)
        .map((s, i) => {
          const t = (s?.text || '').trim();
          const st = s?.start;
          const ed = s?.end;
          const words = Array.isArray(s?.words) ? s.words.length : 0;
          return `[${i}] ${st ?? '-'}–${ed ?? '-'}s words=${words} ${t}`;
        })
        .join('\n')
    : '';
  writeFileSync(
    txtPath,
    `${summary}${segmentsSummary}\n`,
    'utf8'
  );

  return { jsonPath, txtPath };
}

async function main() {
  console.log('WHISPER_TEST_BASE =', base);
  console.log('音频文件 =', audioPath);

  if (!existsSync(audioPath)) {
    console.error('找不到音频文件，请将 test.mp3 放在脚本同目录或设置 WHISPER_TEST_AUDIO。');
    process.exit(1);
    return;
  }

  const healthUrl = `${base}/health`;
  let healthRes;
  try {
    healthRes = await fetch(healthUrl);
  } catch (e) {
    const c = e?.cause;
    console.error('GET', healthUrl, '失败:', e?.message ?? e, c?.code ? `(${c.code})` : '');
    process.exit(1);
    return;
  }

  const healthText = await healthRes.text();
  console.log('GET', healthUrl, '->', healthRes.status, healthText.slice(0, 200));

  let healthObj;
  try {
    healthObj = JSON.parse(healthText);
  } catch {
    healthObj = null;
  }
  if (!healthRes.ok || !healthObj || healthObj.status !== 'ok') {
    console.error('health 非预期（应为 JSON {"status":"ok"}），请确认服务与端口正确。');
    process.exit(1);
    return;
  }

  const wavOrMp3 = readFileSync(audioPath);
  const fileName = audioPath.replace(/^.*[/\\]/, '') || 'audio.mp3';
  const form = new FormData();
  form.append('file', new Blob([wavOrMp3]), fileName);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0.0');

  const infUrl = `${base}/inference`;
  let infRes;
  try {
    infRes = await fetch(infUrl, { method: 'POST', body: form });
  } catch (e) {
    const c = e?.cause;
    console.error('POST', infUrl, '失败:', e?.message ?? e, c?.code ? `(${c.code})` : '');
    writeTempOutput({
      ok: false,
      at: new Date().toISOString(),
      base,
      infUrl,
      error: {
        message: e?.message ?? String(e),
        code: c?.code,
      },
    });
    process.exit(1);
    return;
  }

  const infText = await infRes.text();
  let parsed;
  try {
    parsed = JSON.parse(infText);
  } catch {
    parsed = null;
  }

  console.log('POST', infUrl, '->', infRes.status, ', body', infText.length, 'bytes');
  if (parsed?.error) {
    console.error('inference error:', parsed.error);
    writeTempOutput({ ok: false, at: new Date().toISOString(), base, infUrl, error: parsed.error });
    process.exit(1);
    return;
  }
  if (!parsed || typeof parsed !== 'object') {
    console.error('body:', infText.slice(0, 800));
    writeTempOutput({
      ok: false,
      at: new Date().toISOString(),
      base,
      infUrl,
      error: 'Unexpected response body',
      bodyPreview: infText.slice(0, 800),
    });
    process.exit(1);
    return;
  }

  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  const segCount = Array.isArray(parsed.segments) ? parsed.segments.length : 0;
  const wordCount = Array.isArray(parsed.segments)
    ? parsed.segments.reduce((n, s) => n + (Array.isArray(s.words) ? s.words.length : 0), 0)
    : 0;

  console.log('\n--- 转写结果 ---');
  console.log(text || '（无 text 字段，见下方 segments 摘要）');
  console.log('\n统计: segments =', segCount, ', words =', wordCount);

  const { jsonPath, txtPath } = writeTempOutput({
    ok: true,
    at: new Date().toISOString(),
    base,
    infUrl,
    text: parsed.text,
    segments: parsed.segments,
  });
  console.log('\n已写入临时文件：');
  console.log('JSON:', jsonPath);
  console.log('TXT:', txtPath);

  if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
    const preview = parsed.segments.slice(0, 5).map((s, i) => {
      const t = (s.text || '').trim();
      return `[${i}] ${s.start?.toFixed?.(2) ?? s.start}–${s.end?.toFixed?.(2) ?? s.end}s  ${t}`;
    });
    console.log('\n前几条 segments：\n' + preview.join('\n'));
    if (parsed.segments.length > 5) console.log('... 其余省略');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
