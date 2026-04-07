import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type {
  PracticeEvaluateResultDto,
  PracticeTeachResultDto,
  StudyCardDto,
  StudySetDetailDto,
} from 'src/modules/study-set';
import { paths } from 'src/routes/paths';
import { StudyAiMarkdown } from './components/study-ai-markdown';
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
  const [teach, setTeach] = useState<PracticeTeachResultDto | null>(null);
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachError, setTeachError] = useState<string | null>(null);

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
      setTeach(null);
      setTeachError(null);
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
    setTeach(null);
    setTeachError(null);
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
    setTeach(null);
    setTeachError(null);
  };

  const retryAnswer = () => {
    setResult((current) => {
      if (current?.countsAsCorrect) {
        setScore((s) => Math.max(0, s - 1));
      }
      return null;
    });
    setAnswer('');
    setSubmitError(null);
    setTeach(null);
    setTeachError(null);
  };

  const requestTeach = async () => {
    if (!id || !current || result || teachLoading) return;
    setTeachLoading(true);
    setTeachError(null);
    try {
      const raw = await studySetService.practiceTeach(id, { cardId: current.card.id });
      const data = unwrapStudyPayload<PracticeTeachResultDto>(raw);
      setTeach(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setTeachError(err?.response?.data?.error?.message ?? err?.message ?? '加载讲解失败');
    } finally {
      setTeachLoading(false);
    }
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
            <div className="mb-4">
              <StudyTtsControl
                variant="practice"
                text={current.card.term}
                promptPrefix={current.card.cardType === 'translation' ? '请翻译：' : undefined}
                className="w-full"
              />
            </div>
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="请输入答案" />

            {submitError ? <div className="mt-2 text-sm text-red-600">{submitError}</div> : null}
            {teachError ? <div className="mt-2 text-sm text-red-600">{teachError}</div> : null}

            {teach && !result ? (
              <div className="mt-4 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-slate-800">
                <div className="font-semibold text-indigo-950">AI 讲解 · 怎么答这道题</div>
                {!teach.aiAvailable ? (
                  <p className="text-xs text-indigo-900/80">未连接 AI 时仅显示本地简要提示（配置 DeepSeek 可获短 Markdown 讲解）</p>
                ) : null}
                <StudyAiMarkdown className="text-slate-800">{teach.bodyMd}</StudyAiMarkdown>
                {current.card.cardType === 'qa' && teach.questionTranslation ? (
                  <p className="border-t border-indigo-200/60 pt-2 text-slate-700 leading-relaxed">
                    <span className="font-medium text-slate-800">题干译文：</span>
                    {teach.questionTranslation}
                  </p>
                ) : null}
              </div>
            ) : null}

            {result ? (
              <div className={`mt-4 space-y-3 rounded-lg border px-4 py-3 text-sm ${verdictClass}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{verdictLabel}</span>
                  {typeof result.accuracyScore === 'number' ? (
                    <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-xs font-medium">
                      准确度约 {result.accuracyScore}%
                    </span>
                  ) : null}
                </div>
                {!result.aiAvailable ? (
                  <p className="text-xs opacity-80">未使用 AI 精细点评（配置 API 密钥或稍后再试）</p>
                ) : null}
                <StudyAiMarkdown className="leading-relaxed opacity-95">
                  {result.summary ?? result.feedback}
                </StudyAiMarkdown>
                {result.strengths && result.strengths.length > 0 ? (
                  <div>
                    <p className="font-medium opacity-90">亮点</p>
                    <ul className="mt-1 list-inside list-disc space-y-1 opacity-95">
                      {result.strengths.map((item, i) => (
                        <li key={`str-${i}-${item.slice(0, 32)}`}>
                          <StudyAiMarkdown className="inline opacity-95 [&_p]:my-0">{item}</StudyAiMarkdown>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.issues && result.issues.length > 0 ? (
                  <div>
                    <p className="font-medium opacity-90">待改进</p>
                    <ul className="mt-1 list-inside list-disc space-y-2 opacity-95">
                      {result.issues.map((issue, i) => (
                        <li key={`iss-${i}-${issue.detail.slice(0, 24)}`}>
                          {issue.aspect ? <span className="font-medium">{issue.aspect}：</span> : null}
                          <StudyAiMarkdown className="inline opacity-95 [&_p]:my-0">{issue.detail}</StudyAiMarkdown>
                          {issue.suggestion ? (
                            <div className="mt-0.5 text-xs opacity-90">
                              <span className="font-medium">建议：</span>
                              <StudyAiMarkdown className="inline opacity-90 [&_p]:my-0">{issue.suggestion}</StudyAiMarkdown>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.actionSteps && result.actionSteps.length > 0 ? (
                  <div>
                    <p className="font-medium opacity-90">具体改进步骤</p>
                    <ol className="mt-1 list-inside list-decimal space-y-1 opacity-95">
                      {result.actionSteps.map((item, i) => (
                        <li key={`act-${i}-${item.slice(0, 32)}`}>
                          <StudyAiMarkdown className="inline opacity-95 [&_p]:my-0">{item}</StudyAiMarkdown>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {(result.gapVsReference ?? result.comparisonNote) ? (
                  <div className="opacity-95 leading-relaxed">
                    <span className="font-medium">与参考答案差异：</span>{' '}
                    <StudyAiMarkdown className="inline opacity-95 [&_p]:my-0">
                      {result.gapVsReference ?? result.comparisonNote ?? ''}
                    </StudyAiMarkdown>
                  </div>
                ) : null}
                {result.tips && (!result.actionSteps || result.actionSteps.length === 0) ? (
                  <StudyAiMarkdown className="leading-relaxed opacity-95">{result.tips}</StudyAiMarkdown>
                ) : null}
                {current.card.cardType === 'qa' && result.questionTranslation ? (
                  <p className="border-t border-black/10 pt-2 leading-relaxed opacity-95">
                    <span className="font-medium">题干译文：</span>
                    {result.questionTranslation}
                  </p>
                ) : null}
                {!result.countsAsCorrect ? (
                  <p className="border-t border-black/10 pt-2 font-medium">
                    参考答案：{result.expected}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {!result ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { void requestTeach(); }}
                    disabled={submitting || teachLoading}
                  >
                    {teachLoading ? '讲解生成中…' : '我不会，看讲解'}
                  </Button>
                  <Button onClick={() => { void submit(); }} disabled={answer.trim().length === 0 || submitting}>
                    {submitting ? '批改中…' : '提交'}
                  </Button>
                </>
              ) : null}
              {result ? (
                <>
                  <Button variant="outline" onClick={retryAnswer}>
                    重新答题
                  </Button>
                  <Button onClick={next}>下一题</Button>
                </>
              ) : null}
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
