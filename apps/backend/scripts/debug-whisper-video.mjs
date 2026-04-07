import axios from 'axios';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const targetAudio =
  process.argv[2] ||
  'C:/Users/z1309/Desktop/开发/echoon/apps/backend/uploads/video-audios/1775209447453-bbeeb263010b6ef77ff18459d4a0f9e7.wav';
const url = process.argv[3] || process.env.WHISPER_INFERENCE_URL;

if (!url) {
  // eslint-disable-next-line no-console
  console.error('Missing whisper inference url');
  process.exit(1);
}

const buf = await readFile(targetAudio);
const fileName = path.basename(targetAudio);

const cases = [
  { name: 'current-env', language: process.env.WHISPER_LANGUAGE || '', splitOnWord: true, temperature: '0.0' },
  { name: 'no-language', language: '', splitOnWord: true, temperature: '0.0' },
  { name: 'english-no-split', language: 'en', splitOnWord: false, temperature: '0.0' },
  { name: 'english-temp-02', language: 'en', splitOnWord: true, temperature: '0.2' },
];

for (const c of cases) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buf)]), fileName);
  form.append('response_format', 'verbose_json');
  form.append('temperature', c.temperature);
  if (c.language) form.append('language', c.language);
  if (c.splitOnWord) form.append('split_on_word', 'true');

  const started = Date.now();
  try {
    const { data } = await axios.post(url, form, {
      timeout: 600000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const words = (data?.segments || []).flatMap((s) => s?.words || []);
    // eslint-disable-next-line no-console
    console.log(`\n=== ${c.name} ===`);
    // eslint-disable-next-line no-console
    console.log(`elapsedMs=${Date.now() - started}, segments=${(data?.segments || []).length}, words=${words.length}`);
    // eslint-disable-next-line no-console
    console.log(`text=${String(data?.text || '').slice(0, 300)}`);
    // eslint-disable-next-line no-console
    console.log('firstWords=', words.slice(0, 12).map((w) => `${w.word}@${w.start}-${w.end}`).join(' | '));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`\n=== ${c.name} ===`);
    // eslint-disable-next-line no-console
    console.log(`failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

