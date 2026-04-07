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

      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold">学习集</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="w-56"
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            className="min-w-[200px] flex-1"
            placeholder="描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="button" onClick={createSet} disabled={creating || !title.trim()}>
            新建学习集
          </Button>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {creating ? <div className="text-sm text-gray-500">创建中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded border border-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-3 py-2 font-medium">标题</th>
                  <th className="px-3 py-2 font-medium">卡片数</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-black/10">
                    <td className="px-3 py-2">
                      <Link
                        className="font-medium text-indigo-700 hover:underline"
                        to={paths.main.studySets.detail(row.id)}
                      >
                        {row.title}
                      </Link>
                      {row.description ? (
                        <div className="text-xs text-gray-500">{row.description}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{row._count?.cards ?? 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={paths.main.studySets.detail(row.id)}
                          className={cn(
                            'inline-flex h-8 items-center justify-center rounded-md border border-black/20 bg-white px-3 text-sm font-medium hover:bg-black/5',
                          )}
                        >
                          编辑
                        </Link>
                        <Link
                          to={paths.main.studySets.study(row.id)}
                          className={cn(
                            'inline-flex h-8 items-center justify-center rounded-md border border-black/20 bg-white px-3 text-sm font-medium hover:bg-black/5',
                          )}
                        >
                          练习
                        </Link>
                        <Button type="button" size="sm" variant="outline" onClick={() => removeSet(row.id)}>
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <div className="p-3 text-sm text-gray-500">暂无学习集</div> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
