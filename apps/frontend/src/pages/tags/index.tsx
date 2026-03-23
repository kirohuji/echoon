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

      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold">标签库</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="w-48"
            placeholder="标签名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="w-80"
            placeholder="标签描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="button" onClick={createTag} disabled={creating || !name.trim()}>
            新增标签
          </Button>
        </div>

        {loading ? <div className="text-sm text-gray-500">Loading...</div> : null}
        {creating ? <div className="text-sm text-gray-500">Creating...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded border border-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-3 py-2 font-medium">名称</th>
                  <th className="px-3 py-2 font-medium">描述</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-black/10">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.description || '-'}</td>
                    <td className="px-3 py-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => removeTag(row.id)}>
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <div className="p-3 text-sm text-gray-500">暂无标签</div> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
