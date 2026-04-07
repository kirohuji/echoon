import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PercentBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{value} ({percent}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function StudySetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<StudySetDetailDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const metadata = useMemo(() => ({ title: `学习集概览 ${CONFIG.site.name}` }), []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studySetService.getDetail(id);
      const data = (res as { data?: StudySetDetailDto })?.data;
      if (!data) {
        setError('学习集不存在');
        setDetail(null);
        return;
      }
      setDetail(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMeta = async () => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      await studySetService.updateSet(id, {
        title: title.trim(),
        description: description.trim(),
      });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!id) return <div className="p-4 text-sm text-red-600">无效链接</div>;

  const stats = detail?.stats;
  const attemptTotal = stats?.audience.totalAttempts ?? 0;
  const progressTotal = (stats?.progress.knownCount ?? 0) + (stats?.progress.vagueCount ?? 0) + (stats?.progress.unknownCount ?? 0);
  const topCards = [...(stats?.charts.byCard ?? [])].sort((a, b) => b.attempts - a.attempts).slice(0, 6);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">学习集运营看板</h1>
              <p className="mt-1 text-sm text-indigo-100">面向所有学习用户的使用情况统计</p>
            </div>
            <Link
              to={paths.main.studySets.root}
              className="inline-flex h-9 items-center justify-center rounded-md bg-white/90 px-4 text-sm font-medium text-slate-800 hover:bg-white"
            >
              返回列表
            </Link>
          </div>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && detail ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="总卡片" value={stats?.cards.total ?? detail.cards.length} />
              <KpiCard label="学习用户数" value={stats?.audience.uniqueLearners ?? 0} hint="所有用户" />
              <KpiCard label="累计作答" value={attemptTotal} hint="正确 + 错误" />
              <KpiCard
                label="总体正确率"
                value={`${attemptTotal > 0 ? Math.round(((stats?.progress.correctCount ?? 0) / attemptTotal) * 100) : 0}%`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="基本信息">
                <div className="space-y-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述（可选）" />
                  <Button onClick={saveMeta} disabled={saving || !title.trim()}>
                    {saving ? '保存中…' : '保存'}
                  </Button>
                </div>
              </Panel>

              <Panel title="卡片构成">
                <div className="space-y-3">
                  <PercentBar
                    label="翻译题"
                    value={stats?.cards.translation ?? 0}
                    total={stats?.cards.total ?? 0}
                    color="bg-indigo-500"
                  />
                  <PercentBar
                    label="问答题"
                    value={stats?.cards.qa ?? 0}
                    total={stats?.cards.total ?? 0}
                    color="bg-cyan-500"
                  />
                </div>
              </Panel>

              <Panel title="快捷入口">
                <div className="grid gap-2">
                  <Link to={paths.main.studySets.cards(id)} className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5">卡片管理</Link>
                  <Link to={paths.main.studySets.learn(id)} className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5">学习模式</Link>
                  <Link to={paths.main.studySets.practice(id)} className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/90">练习模式</Link>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="学习反馈分布（全用户）">
                <div className="space-y-3">
                  <PercentBar label="认识" value={stats?.charts.levelDistribution.known ?? 0} total={progressTotal} color="bg-emerald-500" />
                  <PercentBar label="模糊" value={stats?.charts.levelDistribution.vague ?? 0} total={progressTotal} color="bg-amber-500" />
                  <PercentBar label="不认识" value={stats?.charts.levelDistribution.unknown ?? 0} total={progressTotal} color="bg-rose-500" />
                </div>
              </Panel>

              <Panel title="作答正确率分布（全用户）">
                <div className="space-y-3">
                  <PercentBar label="正确" value={stats?.charts.answerDistribution.correct ?? 0} total={attemptTotal} color="bg-emerald-500" />
                  <PercentBar label="错误" value={stats?.charts.answerDistribution.wrong ?? 0} total={attemptTotal} color="bg-rose-500" />
                </div>
              </Panel>
            </div>

            <Panel title="热门卡片（按作答次数）">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">卡片</th>
                      <th className="px-3 py-2 font-medium">学习用户</th>
                      <th className="px-3 py-2 font-medium">作答次数</th>
                      <th className="px-3 py-2 font-medium">正确率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCards.map((item) => (
                      <tr key={item.cardId} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.label || '-'}</td>
                        <td className="px-3 py-2">{item.learners}</td>
                        <td className="px-3 py-2">{item.attempts}</td>
                        <td className="px-3 py-2">{item.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topCards.length === 0 ? <p className="p-3 text-sm text-slate-500">暂无学习数据</p> : null}
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </>
  );
}
