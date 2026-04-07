import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { documentLibraryService, tagService } from 'src/composables/context-provider';
import { UploadWizardDialog } from './components/upload-wizard-dialog';
import { AudioPreviewDialog } from './components/audio-preview-dialog';

type TagItem = { id: string; name: string };
type LibraryItem = {
  id: string;
  title: string;
  fileName: string;
  modelName?: string | null;
  audioProvider?: 'minimax' | 'cartesia' | 'hume' | 'elevenlabs' | 'deepgram' | null;
  audioModel?: string | null;
  audioVoiceId?: string | null;
  audioStatus: 'pending' | 'processing' | 'success' | 'failed';
  createdAt: number;
  tags: Array<{ tag: TagItem }>;
  fileType?: string | null;
  mimeType?: string | null;
};

function isVideoAsset(item: Pick<LibraryItem, 'fileType' | 'mimeType'>) {
  const ext = (item.fileType || '').toLowerCase();
  const mime = (item.mimeType || '').toLowerCase();
  return mime.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'].includes(ext);
}

export default function DocumentLibraryPage() {
  const metadata = useMemo(() => ({ title: `资料库管理 ${CONFIG.site.name}` }), []);
  const [rows, setRows] = useState<LibraryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [openUpload, setOpenUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

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

  const openVideoPreview = (id: string) => {
    setPreviewDocumentId(id);
    setPreviewOpen(true);
  };

  const onOpenVideoManagement = (id: string) => {
    openVideoPreview(id);
  };

  const onRemove = async (id: string) => {
    const ok = window.confirm('确认删除该资料？（会同时删除原 PDF 与生成的音频文件）');
    if (!ok) return;

    try {
      await documentLibraryService.delete({ id });
      if (previewDocumentId === id) {
        setPreviewOpen(false);
        setPreviewDocumentId(null);
      }
      await loadData();
    } catch (e) {
      // eslint-disable-next-line no-console
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
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">资料库</h1>
            <p className="mt-1 text-sm text-slate-500">管理资料上传、标签筛选与音视频处理状态</p>
          </div>
          <Button
            type="button"
            className="bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700"
            onClick={() => setOpenUpload(true)}
          >
            上传资料
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-64 border-slate-200"
              placeholder="搜索标题/文件名/模型"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/30"
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
            <Button type="button" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={loadData}>
              筛选
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'outline'}
              className={viewMode === 'table' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}
              onClick={() => setViewMode('table')}
            >
              表格
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'card' ? 'default' : 'outline'}
              className={viewMode === 'card' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}
              onClick={() => setViewMode('card')}
            >
              卡片
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-8 text-slate-500 shadow-sm">
            <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" aria-hidden />
            <span className="text-sm">加载资料列表...</span>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-sm" role="alert">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          viewMode === 'table' ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">标题</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">文件</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">标签</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">模型</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">音频状态</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">创建时间</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="bg-white transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3">{row.title}</td>
                      <td className="px-4 py-3">{row.fileName}</td>
                      <td className="px-4 py-3">
                        {row.tags.map((item) => item.tag.name).join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div>{row.audioProvider ?? '未配置'}</div>
                        <div className="text-xs text-slate-500">
                          {row.audioModel || row.modelName || '—'}
                          {row.audioVoiceId ? ` / ${row.audioVoiceId}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.audioStatus}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-indigo-600 text-white hover:bg-indigo-700"
                            onClick={() => onOpenVideoManagement(row.id)}
                            disabled={row.audioStatus === 'processing'}
                          >
                            {isVideoAsset(row) ? '视频管理' : '音频管理'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50/80"
                            onClick={() => onRemove(row.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {rows.length === 0 ? <div className="p-3 text-sm text-slate-500">暂无资料</div> : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="space-y-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{row.title}</div>
                      <div className="truncate text-xs text-slate-600">{row.fileName}</div>
                    </div>

                    <div className="text-xs text-slate-700">
                      <span className="font-medium text-slate-900">标签：</span>
                      {row.tags.map((item) => item.tag.name).join(' / ') || '-'}
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-medium text-slate-900">模型：</span>
                      {row.audioProvider ?? '未配置'} / {row.audioModel || row.modelName || '—'}
                      {row.audioVoiceId ? ` / ${row.audioVoiceId}` : ''}
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-medium text-slate-900">音频状态：</span>
                      {row.audioStatus}
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-medium text-slate-900">创建时间：</span>
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={() => onOpenVideoManagement(row.id)}
                      disabled={row.audioStatus === 'processing'}
                    >
                      {isVideoAsset(row) ? '视频管理' : '音频管理'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50/80"
                      onClick={() => onRemove(row.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
              {rows.length === 0 ? <div className="p-3 text-sm text-slate-500">暂无资料</div> : null}
            </div>
          )
        ) : null}
      </div>

      <AudioPreviewDialog
        open={previewOpen}
        documentId={previewDocumentId}
        onClose={() => setPreviewOpen(false)}
      />

      <UploadWizardDialog
        open={openUpload}
        tags={tags}
        onClose={() => setOpenUpload(false)}
        onSuccess={loadData}
      />
    </>
  );
}
