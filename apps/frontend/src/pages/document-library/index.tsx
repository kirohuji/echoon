import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { documentLibraryService, tagService } from 'src/composables/context-provider';
import { UploadWizardDialog } from './components/upload-wizard-dialog';

type TagItem = { id: string; name: string };
type LibraryItem = {
  id: string;
  title: string;
  fileName: string;
  modelName: string;
  audioStatus: 'pending' | 'processing' | 'success' | 'failed';
  createdAt: number;
  tags: Array<{ tag: TagItem }>;
};

export default function DocumentLibraryPage() {
  const metadata = useMemo(() => ({ title: `资料库管理 ${CONFIG.site.name}` }), []);
  const [rows, setRows] = useState<LibraryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [openUpload, setOpenUpload] = useState(false);

  const loadTags = useCallback(async () => {
    const res = await tagService.getAll({});
    setTags(res?.data ?? []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentLibraryService.pagination({
        page: 1,
        limit: 50,
        keyword,
        tagId: selectedTagId || undefined,
      });
      setRows(res?.data?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load document library');
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedTagId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onGenerateAudio = async (id: string) => {
    try {
      await documentLibraryService.generateAudio(id);
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">资料库</h1>
          <Button type="button" onClick={() => setOpenUpload(true)}>
            上传资料
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="w-64"
            placeholder="搜索标题/文件名/模型"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="h-9 rounded-md border border-black/20 px-3 text-sm"
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
          >
            <option value="">全部标签</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={loadData}>
            筛选
          </Button>
        </div>

        {loading ? <div className="text-sm text-gray-500">Loading...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded border border-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-3 py-2 font-medium">标题</th>
                  <th className="px-3 py-2 font-medium">文件</th>
                  <th className="px-3 py-2 font-medium">标签</th>
                  <th className="px-3 py-2 font-medium">模型</th>
                  <th className="px-3 py-2 font-medium">音频状态</th>
                  <th className="px-3 py-2 font-medium">创建时间</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-black/10">
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2">{row.fileName}</td>
                    <td className="px-3 py-2">
                      {row.tags.map((item) => item.tag.name).join(' / ') || '-'}
                    </td>
                    <td className="px-3 py-2">{row.modelName}</td>
                    <td className="px-3 py-2">{row.audioStatus}</td>
                    <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => onGenerateAudio(row.id)}>
                          生成音频
                        </Button>
                        {row.audioStatus === 'success' ? (
                          <a
                            className="inline-flex h-8 items-center rounded-md border border-black/20 px-3 text-xs hover:bg-black/5"
                            href={`${import.meta.env.VITE_SERVER_URL}/document-library/${row.id}/audio`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            音频
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <div className="p-3 text-sm text-gray-500">暂无资料</div> : null}
          </div>
        ) : null}
      </div>

      <UploadWizardDialog
        open={openUpload}
        tags={tags}
        onClose={() => setOpenUpload(false)}
        onSuccess={loadData}
      />
    </>
  );
}
