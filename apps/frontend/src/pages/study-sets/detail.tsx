import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

const surface = 'rounded-xl border border-slate-200/80 bg-white';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] as const },
};

const tooltipNumber = (value: unknown) => [String(value ?? 0), '数量'] as [string, string];

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <m.section {...fadeUp} className={`${surface} p-5`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </m.section>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <m.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`${surface} relative overflow-hidden p-4`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <p className="ml-2 text-xs text-slate-500">{label}</p>
      <p className="ml-2 mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </m.div>
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
  const attempts = stats?.audience.totalAttempts ?? 0;
  const accuracy = attempts > 0 ? Math.round(((stats?.progress.correctCount ?? 0) / attempts) * 100) : 0;

  const typePie = [
    { name: '翻译题', value: stats?.cards.translation ?? 0, color: '#3b82f6' },
    { name: '问答题', value: stats?.cards.qa ?? 0, color: '#8b5cf6' },
  ];

  const levelPie = [
    { name: '认识', value: stats?.charts.levelDistribution.known ?? 0, color: '#22c55e' },
    { name: '模糊', value: stats?.charts.levelDistribution.vague ?? 0, color: '#f59e0b' },
    { name: '不认识', value: stats?.charts.levelDistribution.unknown ?? 0, color: '#ef4444' },
  ];

  const topCards = [...(stats?.charts.byCard ?? [])].sort((a, b) => b.attempts - a.attempts).slice(0, 8);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`${surface} mb-4 p-5`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Study Set Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">学习集运营看板</h1>
              <p className="mt-1 text-sm text-slate-500">参考 Minimals 风格的后台分析布局</p>
            </div>
            <Link
              to={paths.main.studySets.root}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              返回列表
            </Link>
          </div>
        </m.div>

        {loading ? <div className="text-sm text-slate-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && detail ? (
          <>
            <m.div {...fadeUp} className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="总卡片" value={stats?.cards.total ?? detail.cards.length} accent="bg-sky-500" />
              <KpiCard label="学习用户数" value={stats?.audience.uniqueLearners ?? 0} accent="bg-violet-500" />
              <KpiCard label="累计作答" value={attempts} accent="bg-emerald-500" />
              <KpiCard label="总体正确率" value={`${accuracy}%`} accent="bg-amber-500" />
            </m.div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="基本信息" subtitle="管理学习集标题与描述">
                <div className="space-y-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述（可选）" />
                  <Button onClick={saveMeta} disabled={saving || !title.trim()}>
                    {saving ? '保存中…' : '保存'}
                  </Button>
                </div>
              </Panel>

              <Panel title="卡片题型分布" subtitle="translation vs qa">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typePie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78}>
                        {typePie.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipNumber} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="快捷入口" subtitle="管理与学习流程入口">
                <div className="grid gap-2">
                  <Link to={paths.main.studySets.cards(id)} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">卡片管理</Link>
                  <Link to={paths.main.studySets.learn(id)} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">学习模式</Link>
                  <Link to={paths.main.studySets.practice(id)} className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800">练习模式</Link>
                </div>
              </Panel>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <Panel title="学习反馈分布" subtitle="全用户记忆反馈">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={levelPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                        {levelPie.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipNumber} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="热门卡片作答次数" subtitle="Top 8 by attempts">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCards} margin={{ top: 8, right: 8, left: -8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-18} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: unknown) => [String(Number(value ?? 0)), '作答次数'] as [string, string]} />
                      <Bar dataKey="attempts" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
