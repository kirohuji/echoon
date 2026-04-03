/**
 * 词义查询冒烟测试
 *
 * HTTP 模式（默认）：需已登录用户；可设 SMOKE_BASE_URL（含路径前缀）、SMOKE_PHONE、SMOKE_PASSWORD
 *   pnpm run smoke:wordnet
 *   set SMOKE_BASE_URL=http://127.0.0.1:3030&& node scripts/smoke-word-lookup.mjs
 *
 * 离线模式（不启后端，只验证 node_modules 里 wordnet + lemmatizer）：
 *   node scripts/smoke-word-lookup.mjs --offline
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const offline = args.includes('--offline') || process.env.SMOKE_OFFLINE === '1';

/** 与 axios 前端一致：默认无全局 path 前缀；若网关挂在 /api 下则设 SMOKE_BASE_URL=http://host:port/api */
function getBaseUrl() {
  const fromEnv = process.env.SMOKE_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const port = process.env.SMOKE_PORT || process.env.PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

function joinBase(pathname) {
  const base = getBaseUrl();
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!base.includes('://')) {
    return `http://${base}${p}`;
  }
  return `${base}${p}`;
}

async function verifyOffline() {
  const wordnet = require('wordnet');
  const lem = require('wink-lemmatizer');
  await wordnet.init();
  const rows = await wordnet.lookup('hello', true);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('WordNet lookup("hello") 无结果：确认已安装 wordnet 且 node_modules/wordnet/db 存在');
  }
  const c = lem.noun('cats');
  if (c !== 'cat') {
    throw new Error(`wink-lemmatizer 异常: noun("cats") 期望 cat，得到 ${c}`);
  }
  const ctrl = await wordnet.lookup('controls', true).catch(() => null);
  const ctrlOk = Array.isArray(ctrl) && ctrl.length > 0;
  const lemma = await wordnet.lookup('control', true).catch(() => []);
  if (!ctrlOk && (!Array.isArray(lemma) || lemma.length === 0)) {
    throw new Error('WordNet control/controls 均不可用');
  }
  console.log('Offline OK · WordNet + wink-lemmatizer · hello gloss 片段:', String(rows[0]?.glossary).slice(0, 72));
}

async function httpJson(method, pathname, { body, headers = {} } = {}) {
  const url = joinBase(pathname);
  const h = { ...headers };
  if (body !== undefined) {
    h['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, body: json, url };
}

function unwrapApiData(payload) {
  if (payload && typeof payload === 'object' && payload.success === true && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

async function runHttpSmoke() {
  const phone = process.env.SMOKE_PHONE || '13052202624';
  const password = process.env.SMOKE_PASSWORD || '123456';
  const base = getBaseUrl();

  console.log('SMOKE_BASE_URL (effective):', base);

  const login = await httpJson('POST', '/auth/login', {
    body: { phone, password },
  });
  console.log('POST /auth/login', login.status, login.url);

  const loginPayload = unwrapApiData(login.body);
  const tok = loginPayload?.access_token ?? login.body?.data?.access_token;

  if (!tok) {
    console.error('未拿到 access_token。响应片段:', JSON.stringify(login.body).slice(0, 600));
    console.error('若 404：检查 SMOKE_BASE_URL 是否要加路径前缀（例如 /api）。');
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${tok}` };

  const getQ = await httpJson('GET', `/document-library/word-lookup?word=${encodeURIComponent('hello')}`, {
    headers: auth,
  });
  console.log('GET /document-library/word-lookup', getQ.status);

  const lr = await httpJson('POST', '/document-library/word-lookup', {
    body: { candidates: ['hello'] },
    headers: auth,
  });
  console.log('POST /document-library/word-lookup', lr.status);
  const out = unwrapApiData(lr.body);
  console.log(JSON.stringify(lr.body, null, 2).slice(0, 1200));

  const defs = out?.definitions ?? lr.body?.data?.definitions;
  const n = Array.isArray(defs) ? defs.length : 0;
  console.log('definitions length:', n);

  if (n === 0) {
    console.error(`
HTTP 返回无释义。常见原因：
  1) 连到的不是当前代码的后端进程 —— 请重启 nest 再试；
  2) 部署环境未包含 node_modules/wordnet/db —— Docker/拷贝产物时需保留完整 wordnet 包；
  3) 先跑离线自检: node scripts/smoke-word-lookup.mjs --offline
`);
    process.exit(1);
  }
}

try {
  if (offline) {
    await verifyOffline();
  } else {
    await runHttpSmoke();
  }
} catch (e) {
  console.error('Smoke failed:', e?.message || e);
  process.exit(1);
}
