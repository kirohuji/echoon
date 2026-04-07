import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { cn } from 'src/lib/utils';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudySetListItemDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

export default function StudySetListPage() {
  const metadata = useMemo(() => ({ title: `学习集 ${CONFIG.site.name}` }), []);
  const [rows, setRows] = useState<StudySetListItemDto[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studySetService.getAll({});
      setRows((res as { data?: StudySetListItemDto[] })?.data ?? []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createSet = async () => {
    if (!title.trim()) {
      setError('请输入标题');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      await studySetService.post({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      await loadData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const message =
        err?.response?.data?.error?.message ?? err?.message ?? '创建失败';
      setError(String(message));
    } finally {
      setCreating(false);
    }
  };

  const removeSet = async (id: string) => {
    if (!window.confirm('确定删除该学习集及其全部卡片？')) return;
    try {
      await studySetService.delete({ id });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">学习集</h1>
            <p className="mt-1 text-sm text-slate-500">管理学习集、卡片数量与学习入口</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-56 border-slate-200"
              placeholder="标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              className="min-w-[200px] flex-1 border-slate-200"
              placeholder="描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              type="button"
              className="bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700"
              onClick={createSet}
              disabled={creating || !title.trim()}
            >
              新建学习集
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-8 text-slate-500 shadow-sm">
            <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" aria-hidden />
            <span className="text-sm">加载学习集列表...</span>
          </div>
        ) : null}
        {creating ? <div className="text-sm text-slate-500">创建中...</div> : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-sm">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">标题</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">卡片数</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link
                        className="font-medium text-indigo-700 hover:underline"
                        to={paths.main.studySets.detail(row.id)}
                      >
                        {row.title}
                      </Link>
                      {row.description ? (
                        <div className="text-xs text-slate-500">{row.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row._count?.cards ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={paths.main.studySets.detail(row.id)}
                          className={cn(
                            'inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          概览
                        </Link>
                        <Link
                          to={paths.main.studySets.cards(row.id)}
                          className={cn(
                            'inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          卡片
                        </Link>
                        <Link
                          to={paths.main.studySets.learn(row.id)}
                          className={cn(
                            'inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          学习
                        </Link>
                        <Link
                          to={paths.main.studySets.practice(row.id)}
                          className={cn(
                            'inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          练习
                        </Link>
                        <Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50/80" onClick={() => removeSet(row.id)}>
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {rows.length === 0 ? <div className="p-3 text-sm text-slate-500">暂无学习集</div> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
