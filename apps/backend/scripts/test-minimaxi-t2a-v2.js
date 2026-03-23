/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

async function main() {
  loadEnv(path.join(__dirname, '..', '.env'));

  const apiKey = (process.env.MINIMAX_API_KEY || '').trim();
  if (!apiKey) throw new Error('MINIMAX_API_KEY missing');

  const url = 'https://api.minimaxi.com/v1/t2a_v2';
  const payload = {
    model: 'speech-2.8-hd',
    text: '今天是不是很开心呀(laughs)，当然了！',
    stream: false,
    voice_setting: {
      voice_id: 'male-qn-qingse',
      speed: 1,
      vol: 1,
      pitch: 0,
      emotion: 'happy',
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
    pronunciation_dict: {
      tone: ['处理/(chu3)(li3)', '危险/dangerous'],
    },
    subtitle_enable: false,
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

  console.log('base_resp.status_code:', res.data?.base_resp?.status_code);
  console.log('base_resp.status_msg:', res.data?.base_resp?.status_msg);
  console.log('hasAudio:', !!res.data?.data?.audio);
}

main().catch((e) => {
  const data = e.response?.data;
  console.error('ERROR base_resp.status_code:', data?.base_resp?.status_code);
  console.error('ERROR base_resp.status_msg:', data?.base_resp?.status_msg || e.message);
  process.exit(1);
});

