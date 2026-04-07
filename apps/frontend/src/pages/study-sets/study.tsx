import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { CONFIG } from 'src/config-global';
import { cn } from 'src/lib/utils';
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

export default function StudySetStudyPage() {
  const { id } = useParams<{ id: string }>();
  const [cards, setCards] = useState<StudyCardDto[]>([]);
  const [setTitle, setSetTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const metadata = useMemo(() => ({ title: `闪卡练习 ${CONFIG.site.name}` }), []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studySetService.getDetail(id);
      const data = (res as { data?: StudySetDetailDto })?.data;
      if (!data) {
        setError('学习集不存在');
        setCards([]);
        setSetTitle('');
        return;
      }
      setSetTitle(data.title);
      if (data.cards.length === 0) {
        setCards([]);
        setError('请先在学习集里添加卡片');
        return;
      }
      setCards(shuffle(data.cards));
      setIndex(0);
      setFlipped(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '加载失败');
      setCards([]);
      setSetTitle('');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const current = cards[index];
  const total = cards.length;
  const done = total > 0 && index >= total;

  const onReview = async (correct: boolean) => {
    if (!id || !current || reviewing) return;
    try {
      setReviewing(true);
      await studySetService.review(id, { cardId: current.id, correct });
      setFlipped(false);
      setIndex((i) => i + 1);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '提交失败');
    } finally {
      setReviewing(false);
    }
  };

  const restart = () => {
    setCards((prev) => shuffle(prev));
    setIndex(0);
    setFlipped(false);
    setError(null);
  };

  if (!id) {
    return <div className="p-4 text-sm text-red-600">无效链接</div>;
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            to={paths.main.studySets.detail(id)}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-md border border-black/20 bg-white px-3 text-sm font-medium hover:bg-black/5',
            )}
          >
            返回编辑
          </Link>
          <Link
            to={paths.main.studySets.root}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-md border border-black/20 bg-white px-3 text-sm font-medium hover:bg-black/5',
            )}
          >
            列表
          </Link>
        </div>

        <h1 className="mb-1 text-xl font-semibold">{setTitle || '闪卡练习'}</h1>
        {total > 0 && !done ? (
          <p className="mb-4 text-sm text-gray-500">
            进度 {index + 1} / {total}
          </p>
        ) : null}

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

        {!loading && !done && current ? (
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="mb-6 flex min-h-[200px] w-full flex-col items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-6 text-center shadow-sm transition hover:border-indigo-300"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-indigo-600/80">
                {flipped ? '背面' : '正面'}
              </span>
              <span className="mt-3 text-lg font-medium text-slate-800">
                {flipped ? current.definition : current.term}
              </span>
              <span className="mt-4 text-xs text-gray-500">点击翻面</span>
            </button>

            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" variant="outline" disabled={reviewing} onClick={() => onReview(false)}>
                不认识
              </Button>
              <Button type="button" disabled={reviewing} onClick={() => onReview(true)}>
                认识
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && done ? (
          <div className="mx-auto max-w-lg rounded-lg border border-black/10 bg-white p-6 text-center shadow-sm">
            <p className="mb-4 text-base font-medium text-slate-800">本轮已完成</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={restart}>
                再练一轮
              </Button>
              <Link
                to={paths.main.studySets.detail(id)}
                className={cn(
                  'inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5',
                )}
              >
                编辑卡片
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
