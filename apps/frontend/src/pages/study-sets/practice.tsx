import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { PracticeEvaluateResultDto, StudyCardDto, StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';
import { StudyTtsControl } from './components/study-tts-control';

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

function unwrapStudyPayload<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { success?: boolean }).success === true) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

type PracticeResultState = PracticeEvaluateResultDto & { expected: string };

export default function StudySetPracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const metadata = useMemo(() => ({ title: `练习模式 ${CONFIG.site.name}` }), []);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<PracticeResultState | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setSubmitError(null);
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
    if (!id || !current || result || submitting) return;
    if (!answer.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const raw = await studySetService.practiceEvaluate(id, {
        cardId: current.card.id,
        userAnswer: answer.trim(),
      });
      const ev = unwrapStudyPayload<PracticeEvaluateResultDto>(raw);
      setResult({ ...ev, expected: current.expected });
      if (ev.countsAsCorrect) setScore((s) => s + 1);
      await studySetService.review(id, { cardId: current.card.id, correct: ev.countsAsCorrect });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setSubmitError(err?.response?.data?.error?.message ?? err?.message ?? '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setAnswer('');
    setResult(null);
    setSubmitError(null);
  };

  const verdictLabel =
    result?.verdict === 'correct' ? '判为正确' : result?.verdict === 'partial' ? '部分正确' : '需要改进';

  const verdictClass =
    result?.verdict === 'correct'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : result?.verdict === 'partial'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-rose-200 bg-rose-50 text-rose-900';

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
            <div className="mb-4 flex flex-wrap items-start gap-3">
              <p className="min-w-0 flex-1 text-lg font-medium text-slate-800">{current.prompt}</p>
              <StudyTtsControl text={current.card.term} className="shrink-0" />
            </div>
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="请输入答案" />

            {submitError ? <div className="mt-2 text-sm text-red-600">{submitError}</div> : null}

            {result ? (
              <div className={`mt-4 space-y-3 rounded-lg border px-4 py-3 text-sm ${verdictClass}`}>
                <div className="font-semibold">{verdictLabel}</div>
                {!result.aiAvailable ? (
                  <p className="text-xs opacity-80">未使用 AI 精细点评（配置 API 密钥或稍后再试）</p>
                ) : null}
                <p className="leading-relaxed">{result.feedback}</p>
                {result.tips ? <p className="leading-relaxed text-slate-800">{result.tips}</p> : null}
                {result.comparisonNote ? (
                  <p className="text-slate-700 leading-relaxed">{result.comparisonNote}</p>
                ) : null}
                {!result.countsAsCorrect ? (
                  <p className="border-t border-black/10 pt-2 text-slate-800">
                    参考答案：{result.expected}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              {!result ? (
                <Button onClick={() => { void submit(); }} disabled={!answer.trim() || submitting}>
                  {submitting ? '批改中…' : '提交'}
                </Button>
              ) : null}
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
