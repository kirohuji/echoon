import * as wordnet from 'wordnet';

export type EnglishWordDefinition = {
  partOfSpeech: string;
  gloss: string;
  synonyms: string[];
};

export type EnglishWordLookupResult = {
  word: string;
  definitions: EnglishWordDefinition[];
};

/**
 * wink-lemmatizer 是 CommonJS 的 `module.exports`，在未开启 esModuleInterop 时
 * `import lemmatize from '...'` 会编译成 `require(...).default.noun`，运行时为 undefined。
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lemmatize = require('wink-lemmatizer') as {
  noun: (s: string) => string;
  verb: (s: string) => string;
  adjective: (s: string) => string;
};

let initPromise: Promise<void> | null = null;

export function ensureEnglishWordnetLoaded(): Promise<void> {
  if (initPromise === null) {
    initPromise = wordnet.init() as Promise<void>;
  }
  return initPromise;
}

export function normalizeEnglishLookupInput(input: string): string {
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/^[^a-z\s'-]+|[^a-z\s'-]+$/g, '')
    .replace(/\s+/g, ' ');
}

function wordnetSurfaceVariants(surface: string): string[] {
  return Array.from(
    new Set([
      surface,
      surface.replace(/\s+/g, '_'),
      surface.replace(/'/g, ''),
      surface.replace(/\s+/g, '_').replace(/'/g, ''),
    ]),
  ).filter(Boolean);
}

function collectWordFormLemmas(token: string): string[] {
  if (!token || !/^[a-z']+$/.test(token)) {
    return [];
  }
  const lemmas = new Set<string>();
  for (const fn of [lemmatize.noun, lemmatize.verb, lemmatize.adjective] as const) {
    try {
      const L = fn(token);
      if (L && L !== token) {
        lemmas.add(L);
      }
    } catch {
      /* ignore */
    }
  }
  return [...lemmas];
}

function lemmatizePhraseByTokens(phrase: string): string | null {
  const tokens = phrase.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return null;
  }
  const next: string[] = [];
  let changed = false;
  for (const t of tokens) {
    if (!/^[a-z']+$/.test(t)) {
      next.push(t);
      continue;
    }
    const lemmas = collectWordFormLemmas(t);
    if (!lemmas.length) {
      next.push(t);
      continue;
    }
    next.push(lemmas.sort()[0]);
    changed = true;
  }
  return changed ? next.join(' ') : null;
}

function buildWordnetLookupQueue(normalizedWord: string): string[] {
  const queue: string[] = [];
  const seen = new Set<string>();
  const pushSurface = (surface: string) => {
    for (const v of wordnetSurfaceVariants(surface)) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  };

  pushSurface(normalizedWord);

  const singleToken = !normalizedWord.includes(' ');
  if (!singleToken) {
    const phraseLemma = lemmatizePhraseByTokens(normalizedWord);
    if (phraseLemma) {
      pushSurface(phraseLemma);
    }
  } else if (/^[a-z']+$/.test(normalizedWord)) {
    for (const lemma of collectWordFormLemmas(normalizedWord)) {
      pushSurface(lemma);
    }
  }

  return queue;
}

function mapWordnetRows(rows: any[]): EnglishWordDefinition[] {
  return (rows || []).slice(0, 6).map((item) => ({
    partOfSpeech: item?.meta?.synsetType || 'unknown',
    gloss: item?.glossary || '',
    synonyms: (item?.meta?.words || [])
      .map((w: { word?: string }) => String(w?.word ?? '').replace(/_/g, ' '))
      .filter(Boolean)
      .slice(0, 6),
  }));
}

export async function lookupOneEnglishWord(word: string): Promise<EnglishWordLookupResult> {
  const normalizedWord = normalizeEnglishLookupInput(word);
  if (!normalizedWord) {
    return { word: '', definitions: [] };
  }

  await ensureEnglishWordnetLoaded();
  try {
    const lookupQueue = buildWordnetLookupQueue(normalizedWord);
    let rows: any[] = [];
    for (const variant of lookupQueue) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await wordnet.lookup(variant, true);
        if (Array.isArray(result) && result.length) {
          rows = result;
          break;
        }
      } catch {
        /* try next variant */
      }
    }
    return {
      word: normalizedWord,
      definitions: mapWordnetRows(rows),
    };
  } catch {
    return { word: normalizedWord, definitions: [] };
  }
}

const CANDIDATE_CAP = 32;

export async function lookupEnglishFirstHit(candidates: unknown): Promise<EnglishWordLookupResult> {
  if (!Array.isArray(candidates)) {
    return { word: '', definitions: [] };
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const t = String(c ?? '').trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
    if (deduped.length >= CANDIDATE_CAP) break;
  }

  if (!deduped.length) {
    return { word: '', definitions: [] };
  }

  await ensureEnglishWordnetLoaded();
  for (const c of deduped) {
    const result = await lookupOneEnglishWord(c);
    if (result.definitions.length > 0) {
      return result;
    }
  }

  const lastNorm = normalizeEnglishLookupInput(deduped[deduped.length - 1] ?? '');
  return { word: lastNorm, definitions: [] };
}
