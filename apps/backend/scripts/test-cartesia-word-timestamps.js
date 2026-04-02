/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { WebSocket } = require('ws');

function loadEnv(envFile) {
  if (!fs.existsSync(envFile)) return;
  const raw = fs.readFileSync(envFile, 'utf8');
  raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      process.env[key] = value;
    });
}

function pickSample(arr, n = 3) {
  if (!Array.isArray(arr) || arr.length === 0) return { first: [], last: [] };
  return {
    first: arr.slice(0, n),
    last: arr.slice(Math.max(0, arr.length - n)),
  };
}

async function main() {
  loadEnv(path.join(__dirname, '..', '.env'));

  const apiKey = (process.env.CARTESIA_API_KEY || process.env.CARTERSIA_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('CARTESIA_API_KEY (或 CARTERSIA_API_KEY) is not set');
  }

  const version = '2026-04-02';
  const sampleRate = 44100;

  const model = (process.env.CARTESIA_MODEL_ID || 'sonic-3').trim();
  const voiceId = (process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02').trim();

  const transcript =
    process.env.CARTESIA_TEXT ||
    'Fiber keeps me full, and natural sugar gives me lasting energy';

  const contextId = (process.env.CARTESIA_CONTEXT_ID || 'tmp-cartesia-test').replace(/[^A-Za-z0-9_-]/g, '-');

  const url = `wss://api.cartesia.ai/tts/websocket?api_key=${encodeURIComponent(apiKey)}&cartesia_version=${encodeURIComponent(
    version,
  )}`;

  let seenTimestamps = 0;
  let lastWordTimestamps = null;
  let chunkCount = 0;

  console.log('=== cartesia websocket test ===');
  console.log('model:', model);
  console.log('voiceId:', voiceId);
  console.log('contextId:', contextId);
  console.log('text:', transcript);

  const websocket = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Cartesia-Version': version,
    },
  });

  const timeoutMs = Number(process.env.CARTESIA_TEST_TIMEOUT_MS || 30000);

  const timeout = setTimeout(() => {
    console.error('timeout, exiting...');
    try {
      websocket.close();
    } catch {
      // ignore
    }
    process.exit(1);
  }, timeoutMs);

  websocket.on('open', () => {
    websocket.send(
      JSON.stringify({
        model_id: model,
        context_id: contextId,
        transcript,
        voice: { mode: 'id', id: voiceId },
        output_format: {
          container: 'raw',
          encoding: 'pcm_f32le',
          sample_rate: sampleRate,
        },
        add_timestamps: true,
      }),
    );
  });

  websocket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (e) {
      console.log('non-json message:', raw.toString().slice(0, 200));
      return;
    }

    const type = message.type || '(no type)';

    if (type === 'chunk') {
      chunkCount += 1;
      return;
    }

    if (type === 'timestamps' || type === 'word_timestamps') {
      seenTimestamps += 1;
      const payload = message.word_timestamps || message.data || {};
      const words = payload.words || [];
      const start = payload.start || [];
      const end = payload.end || [];

      console.log('--- timestamps event', seenTimestamps, '---');
      console.log('words.length:', words.length, 'start.length:', start.length, 'end.length:', end.length);

      const sampleWords = pickSample(words, 3);
      const sampleStart = pickSample(start, 3);
      const sampleEnd = pickSample(end, 3);

      console.log('words.first:', sampleWords.first);
      console.log('words.last:', sampleWords.last);
      console.log('start.first:', sampleStart.first);
      console.log('start.last:', sampleStart.last);
      console.log('end.first:', sampleEnd.first);
      console.log('end.last:', sampleEnd.last);

      lastWordTimestamps = { words, start, end };
      return;
    }

    if (type === 'error') {
      console.error('cartesia error:', message.message || message.error || message);
      clearTimeout(timeout);
      try {
        websocket.close();
      } catch {
        // ignore
      }
      process.exit(1);
      return;
    }

    if (type === 'done' || message.done) {
      console.log('done received. chunkCount:', chunkCount, 'timestampsEvents:', seenTimestamps);
      clearTimeout(timeout);
      try {
        websocket.close();
      } catch {
        // ignore
      }

      if (!lastWordTimestamps) {
        console.log('no timestamps payload captured');
        process.exit(1);
      }

      const { words, start, end } = lastWordTimestamps;
      const lastIndex = Math.max(0, words.length - 1);
      console.log('FINAL check: last word:', words[lastIndex]);
      console.log('FINAL check: last start:', start[lastIndex]);
      console.log('FINAL check: last end:', end[lastIndex]);
      process.exit(0);
      return;
    }
  });

  websocket.on('error', (err) => {
    clearTimeout(timeout);
    console.error('websocket error:', err?.message || err);
    process.exit(1);
  });

  websocket.on('close', () => {
    clearTimeout(timeout);
  });
}

main().catch((e) => {
  console.error('ERROR:', e?.message || e);
  process.exit(1);
});

