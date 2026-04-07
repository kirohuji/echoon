import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

const softCard = 'rounded-lg border border-slate-200/80 bg-white';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
};

const tooltipNumber = (value: unknown) => [String(value ?? 0), '数量'] as [string, string];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section {...fadeUp} className={`${softCard} p-4`}>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </motion.section>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`${softCard} p-3`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </motion.div>
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
  const topCards = [...(stats?.charts.byCard ?? [])].sort((a, b) => b.attempts - a.attempts).slice(0, 8);

  const typePie = [
    { name: '翻译题', value: stats?.cards.translation ?? 0, color: '#4f46e5' },
    { name: '问答题', value: stats?.cards.qa ?? 0, color: '#06b6d4' },
  ];

  const levelPie = [
    { name: '认识', value: stats?.charts.levelDistribution.known ?? 0, color: '#10b981' },
    { name: '模糊', value: stats?.charts.levelDistribution.vague ?? 0, color: '#f59e0b' },
    { name: '不认识', value: stats?.charts.levelDistribution.unknown ?? 0, color: '#f43f5e' },
  ];

  const answerPie = [
    { name: '正确', value: stats?.charts.answerDistribution.correct ?? 0, color: '#10b981' },
    { name: '错误', value: stats?.charts.answerDistribution.wrong ?? 0, color: '#f43f5e' },
  ];

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="space-y-4 p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-lg border border-indigo-200/60 bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">学习集运营看板</h1>
              <p className="mt-1 text-sm text-indigo-100">全用户学习/练习行为统计</p>
            </div>
            <Link
              to={paths.main.studySets.root}
              className="inline-flex h-9 items-center justify-center rounded-md bg-white/95 px-4 text-sm font-medium text-slate-900 transition hover:bg-white"
            >
              返回列表
            </Link>
          </div>
        </motion.div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && detail ? (
          <>
            <motion.div {...fadeUp} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="总卡片" value={stats?.cards.total ?? detail.cards.length} />
              <KpiCard label="学习用户数" value={stats?.audience.uniqueLearners ?? 0} hint="所有用户" />
              <KpiCard label="累计作答" value={attemptTotal} hint="正确 + 错误" />
              <KpiCard
                label="总体正确率"
                value={`${attemptTotal > 0 ? Math.round(((stats?.progress.correctCount ?? 0) / attemptTotal) * 100) : 0}%`}
              />
            </motion.div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="基本信息">
                <div className="space-y-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="描述（可选）"
                  />
                  <Button onClick={saveMeta} disabled={saving || !title.trim()}>
                    {saving ? '保存中…' : '保存'}
                  </Button>
                </div>
              </Panel>

              <Panel title="卡片题型分布">
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
                <div className="flex justify-center gap-4 text-xs text-slate-600">
                  {typePie.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="快捷入口">
                <div className="grid gap-2">
                  <Link
                    to={paths.main.studySets.cards(id)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
                  >
                    卡片管理
                  </Link>
                  <Link
                    to={paths.main.studySets.learn(id)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
                  >
                    学习模式
                  </Link>
                  <Link
                    to={paths.main.studySets.practice(id)}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    练习模式
                  </Link>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="学习反馈分布（全用户）">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={levelPie} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78}>
                        {levelPie.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipNumber} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="作答正确/错误分布（全用户）">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={answerPie} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78}>
                        {answerPie.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipNumber} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel title="热门卡片（按作答次数）">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCards} margin={{ top: 6, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: unknown, key: unknown) => {
                        const label = String(key ?? '');
                        const safe = Number(value ?? 0);
                        if (label === 'attempts') return [`${safe}`, '作答次数'] as [string, string];
                        if (label === 'learners') return [`${safe}`, '学习用户'] as [string, string];
                        if (label === 'accuracy') return [`${safe}%`, '正确率'] as [string, string];
                        return [String(safe), label] as [string, string];
                      }}
                    />
                    <Bar dataKey="attempts" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </>
  );
}
