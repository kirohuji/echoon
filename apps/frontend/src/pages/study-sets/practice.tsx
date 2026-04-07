import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudyCardDto, StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

type PracticeQuestion = {
  card: StudyCardDto;
  prompt: string;
  expected: string;
  typeLabel: string;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function StudySetPracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const metadata = useMemo(() => ({ title: `练习模式 ${CONFIG.site.name}` }), []);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<null | { correct: boolean; expected: string }>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuestions = (cards: StudyCardDto[]) =>
    shuffle(
      cards.map((card) => {
        if (card.cardType === 'qa') {
          return {
            card,
            prompt: card.term,
            expected: card.definition,
            typeLabel: '问答题',
          };
        }
        return {
          card,
          prompt: `请翻译：${card.term}`,
          expected: card.definition,
          typeLabel: '翻译题',
        };
      }),
    );

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
      setQuestions(buildQuestions(data.cards));
      setIndex(0);
      setAnswer('');
      setResult(null);
      setScore(0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id) return <div className="p-4 text-sm text-red-600">无效链接</div>;

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(paths.main.studySets.detail(id));
  };

  const done = questions.length > 0 && index >= questions.length;
  const current = questions[index];

  const submit = async () => {
    if (!id || !current || result) return;
    const isCorrect = normalize(answer) === normalize(current.expected);
    setResult({ correct: isCorrect, expected: current.expected });
    if (isCorrect) setScore((s) => s + 1);
    await studySetService.review(id, { cardId: current.card.id, correct: isCorrect });
  };

  const next = () => {
    setIndex((i) => i + 1);
    setAnswer('');
    setResult(null);
  };

  return (
    <>
      <Helmet><title>{metadata.title}</title></Helmet>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">练习模式 · {title}</h1>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5"
          >
            返回
          </button>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !done && current ? (
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
              <span>{current.typeLabel}</span>
              <span>第 {index + 1} / {questions.length} 题</span>
            </div>
            <p className="mb-4 text-lg font-medium text-slate-800">{current.prompt}</p>
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="请输入答案" />

            {result ? (
              <div className={`mt-3 rounded-md px-3 py-2 text-sm ${result.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.correct ? '回答正确' : `回答错误，标准答案：${result.expected}`}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              {!result ? <Button onClick={() => { void submit(); }} disabled={!answer.trim()}>提交</Button> : null}
              {result ? <Button variant="outline" onClick={next}>下一题</Button> : null}
            </div>
          </div>
        ) : null}

        {!loading && done ? (
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-semibold">练习完成</p>
            <p className="mt-2 text-sm text-slate-600">得分：{score} / {questions.length}</p>
            <Button className="mt-4" onClick={() => { void load(); }}>再测一次</Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
