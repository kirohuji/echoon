import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

function CardBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
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
    load();
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

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">学习集概览</h1>
          <Link
            to={paths.main.studySets.root}
            className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5"
          >
            返回列表
          </Link>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && detail ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <CardBlock title="基本信息">
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
            </CardBlock>

            <CardBlock title="统计信息">
              <div className="space-y-2 text-sm text-slate-700">
                <p>总卡片：{detail.stats?.cards.total ?? detail.cards.length}</p>
                <p>翻译题：{detail.stats?.cards.translation ?? 0}</p>
                <p>问答题：{detail.stats?.cards.qa ?? 0}</p>
                <p>答对：{detail.stats?.progress.correctCount ?? 0}</p>
                <p>答错：{detail.stats?.progress.wrongCount ?? 0}</p>
                <p>认识/模糊/不认识：
                  {detail.stats?.progress.knownCount ?? 0} / {detail.stats?.progress.vagueCount ?? 0} / {detail.stats?.progress.unknownCount ?? 0}
                </p>
              </div>
            </CardBlock>

            <CardBlock title="学习入口">
              <div className="flex flex-col gap-2">
                <Link
                  to={paths.main.studySets.cards(id)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5"
                >
                  卡片管理
                </Link>
                <Link
                  to={paths.main.studySets.learn(id)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5"
                >
                  学习模式
                </Link>
                <Link
                  to={paths.main.studySets.practice(id)}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/90"
                >
                  练习模式
                </Link>
              </div>
            </CardBlock>
          </div>
        ) : null}
      </div>
    </>
  );
}
