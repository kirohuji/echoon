import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudyCardDto, StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function StudySetLearnPage() {
  const { id } = useParams<{ id: string }>();
  const metadata = useMemo(() => ({ title: `学习模式 ${CONFIG.site.name}` }), []);
  const [cards, setCards] = useState<StudyCardDto[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [weakFirst, setWeakFirst] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studySetService.getDetail(id);
      const data = (res as { data?: StudySetDetailDto })?.data;
      if (!data) {
        setError('学习集不存在');
        return;
      }
      setTitle(data.title);
      const sorted = [...data.cards].sort((a, b) => {
        if (!weakFirst) return 0;
        const aScore = (a.progress?.unknownCount ?? 0) * 2 + (a.progress?.vagueCount ?? 0);
        const bScore = (b.progress?.unknownCount ?? 0) * 2 + (b.progress?.vagueCount ?? 0);
        return bScore - aScore;
      });
      setCards(shuffle(sorted));
      setIndex(0);
      setFlipped(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, weakFirst]);

  useEffect(() => {
    load();
  }, [load]);

  const current = cards[index];

  const feedback = async (level: 'known' | 'vague' | 'unknown') => {
    if (!id || !current) return;
    await studySetService.learnFeedback(id, { cardId: current.id, level });
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  if (!id) return <div className="p-4 text-sm text-red-600">无效链接</div>;

  const done = cards.length > 0 && index >= cards.length;

  return (
    <>
      <Helmet><title>{metadata.title}</title></Helmet>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">学习模式 · {title}</h1>
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={weakFirst} onChange={(e) => setWeakFirst(e.target.checked)} />
            弱项优先
          </label>
          <Link to={paths.main.studySets.detail(id)} className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5">返回概览</Link>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && current && !done ? (
          <div className="mx-auto max-w-2xl rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-xs uppercase tracking-wide text-indigo-600">{flipped ? '背面' : '正面'}</p>
            <button type="button" onClick={() => setFlipped((f) => !f)} className="min-h-[200px] w-full rounded-lg border border-slate-200 bg-slate-50 px-6 py-8 text-left text-lg font-medium text-slate-800">
              {flipped ? current.definition : current.term}
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500">进度 {index + 1}/{cards.length}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { void feedback('unknown'); }}>不认识</Button>
                <Button variant="outline" onClick={() => { void feedback('vague'); }}>模糊</Button>
                <Button onClick={() => { void feedback('known'); }}>认识</Button>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && done ? (
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="mb-4 font-medium">本轮学习已完成</p>
            <Button onClick={() => { void load(); }}>再来一轮</Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
