import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { tagService } from 'src/composables/context-provider';

type TagItem = {
  id: string;
  name: string;
  description?: string;
};

export default function TagsPage() {
  const metadata = useMemo(() => ({ title: `标签库管理 ${CONFIG.site.name}` }), []);
  const [rows, setRows] = useState<TagItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tagService.getAll({});
      setRows(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTag = async () => {
    if (!name.trim()) {
      setError('请输入标签名');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      await tagService.post({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      await loadData();
    } catch (e) {
      // axios error -> response.data.error.message
      const message =
        e?.response?.data?.error?.message ??
        e?.message ??
        'Failed to create tag';
      setError(message);
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const removeTag = async (id: string) => {
    try {
      await tagService.delete({ id });
      loadData();
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
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">标签库</h1>
            <p className="mt-1 text-sm text-slate-500">管理资料标签，用于筛选与归类</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-48 border-slate-200"
              placeholder="标签名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="w-80 border-slate-200"
              placeholder="标签描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              type="button"
              className="bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700"
              onClick={createTag}
              disabled={creating || !name.trim()}
            >
              新增标签
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-8 text-slate-500 shadow-sm">
            <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" aria-hidden />
            <span className="text-sm">加载标签列表...</span>
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">名称</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">描述</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.description || '-'}</td>
                    <td className="px-4 py-3">
                      <Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50/80" onClick={() => removeTag(row.id)}>
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {rows.length === 0 ? <div className="p-3 text-sm text-slate-500">暂无标签</div> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
