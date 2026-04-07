import type { SynthesizeSpeechResponse } from 'src/modules/document-library';

const MAX_ENTRIES = 48;
const cache = new Map<string, SynthesizeSpeechResponse>();

function touch(key: string) {
  const v = cache.get(key);
  if (v === undefined) return;
  cache.delete(key);
  cache.set(key, v);
}

export function getStudyTtsCached(key: string): SynthesizeSpeechResponse | undefined {
  const v = cache.get(key);
  if (v === undefined) return undefined;
  touch(key);
  return v;
}

export function setStudyTtsCached(key: string, value: SynthesizeSpeechResponse) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_ENTRIES) {
    const first = cache.keys().next().value as string;
    cache.delete(first);
  }
}

export function deleteStudyTtsCached(key: string) {
  cache.delete(key);
}
