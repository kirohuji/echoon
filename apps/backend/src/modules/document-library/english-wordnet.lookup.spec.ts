import { lookupEnglishFirstHit, lookupOneEnglishWord } from './english-wordnet.lookup';

describe('english-wordnet.lookup', () => {
  it('resolves hello', async () => {
    const r = await lookupOneEnglishWord('hello');
    expect(r.definitions.length).toBeGreaterThan(0);
  });

  it('resolves plural controls via lemma control', async () => {
    const r = await lookupOneEnglishWord('controls');
    expect(r.definitions.length).toBeGreaterThan(0);
  });

  it('first match skips misses', async () => {
    const r = await lookupEnglishFirstHit(['notawordxyz123', 'water']);
    expect(r.word).toBe('water');
    expect(r.definitions.length).toBeGreaterThan(0);
  });
});
