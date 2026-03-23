/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

async function main() {
  // Load env from apps/backend/.env (so local node scripts can run).
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      });
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is not set');
  }

  const projectRoot = process.cwd();
  const pdfDir = path.join(projectRoot, 'uploads', 'documents');
  const audioDir = path.join(projectRoot, 'uploads', 'audios');

  fs.mkdirSync(pdfDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });

  const pdfPath = path.join(pdfDir, '__smoke_test.pdf');

  const text = 'Hello PDFJS';
  const esc = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  // Build a tiny one-page PDF (computed xref offsets).
  const objects = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      id: 3,
      body:
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    },
  ];

  const contentStream =
    'BT\n' +
    '/F1 24 Tf\n' +
    '72 72 Td\n' +
    '(' +
    esc +
    ') Tj\n' +
    'ET\n';

  objects.push({
    id: 4,
    body: `<< /Length ${Buffer.byteLength(contentStream)} >>\nstream\n${contentStream}endstream`,
  });
  objects.push({ id: 5, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });

  let pdf = '%PDF-1.1\n';
  const offsets = {};
  for (const obj of objects) {
    offsets[obj.id] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 6\n';
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= 5; id += 1) {
    const off = offsets[id];
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  fs.writeFileSync(pdfPath, pdf);
  console.log('pdf written:', pdfPath);

  // 1) Extract text with pdfjs-dist (same legacy mjs entry as backend).
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;

  let extracted = '';
  for (let pageNumber = 1; pageNumber <= (pdfDoc.numPages || 0); pageNumber += 1) {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const strings = (textContent.items || []).map((it) => it.str || '');
    extracted += strings.join(' ') + '\n';
  }
  extracted = extracted.trim();
  console.log('extracted:', extracted);
  if (!extracted) throw new Error('extractPdfText returned empty text');

  // 2) minimax TTS
  const axios = require('axios');
  const speechModel = 'speech-01-hd';
  const inputText = extracted.length > 10000 ? extracted.slice(0, 10000) : extracted;
  const hasCJK = /[\u4E00-\u9FFF]/.test(inputText);
  const voice_id = hasCJK ? 'female-chengshu' : 'English_expressive_narrator';

  const res = await axios.post(
    'https://api-uw.minimax.io/v1/t2a_v2',
    {
      model: speechModel,
      text: inputText,
      stream: false,
      language_boost: 'auto',
      output_format: 'hex',
      voice_setting: {
        voice_id,
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
    },
  );

  const audioHex = res?.data?.data?.audio;
  if (!audioHex) {
    console.log('minimax response keys:', Object.keys(res?.data || {}));
    console.log('minimax base_resp:', res?.data?.base_resp);
    console.log('minimax data:', res?.data?.data);
    console.log('minimax extra_info:', res?.data?.extra_info);
    throw new Error('minimax returned empty audio');
  }

  const audioBuffer = Buffer.from(audioHex, 'hex');
  const audioPath = path.join(audioDir, '__smoke_test.mp3');
  fs.writeFileSync(audioPath, audioBuffer);
  console.log('audio written:', audioPath, 'bytes:', audioBuffer.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

