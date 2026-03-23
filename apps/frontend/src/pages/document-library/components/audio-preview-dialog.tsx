import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import AudioPlayer from 'react-audio-player';

import { Button } from 'src/components/ui/button';
import { documentLibraryService } from 'src/composables/context-provider';

type AudioPreviewDialogProps = {
  open: boolean;
  documentId: string | null;
  onClose: () => void;
};

export function AudioPreviewDialog({ open, documentId, onClose }: AudioPreviewDialogProps) {
  const [doc, setDoc] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const [pollingRun, setPollingRun] = useState(0);
  const [editableText, setEditableText] = useState<string>('');
  const [textDirty, setTextDirty] = useState(false);

  const objectUrlRef = useRef<string>('');

  const stopAndCleanupAudioUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setAudioUrl('');
  }, []);

  const refresh = useCallback(async () => {
    if (!documentId) return null;
    const res = await documentLibraryService.get({ id: documentId });
    return res?.data ?? null;
  }, [documentId]);

  // 把提取文本同步到可编辑文本：processing 阶段不覆盖用户输入
  useEffect(() => {
    if (!doc) return;
    if (doc?.audioStatus === 'processing') return;
    if (textDirty) return;
    setEditableText(doc?.extractedText ?? '');
  }, [doc, textDirty]);

  // 当重新开始生成时，清空“已手动编辑”的标记
  useEffect(() => {
    if (doc?.audioStatus === 'processing') {
      setTextDirty(false);
      setEditableText(doc?.extractedText ?? '');
    }
  }, [doc?.audioStatus]);

  // 轮询进度：直到 success/failed，然后停止（用户要求失败也停止轮询）。
  useEffect(() => {
    if (!open || !documentId) {
      setDoc(null);
      stopAndCleanupAudioUrl();
      setPolling(false);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    setPolling(true);

    const loop = async () => {
      try {
        const data = await refresh();
        if (cancelled) return;
        setDoc(data);

        const status = data?.audioStatus;
        if (status === 'success' || status === 'failed') {
          setPolling(false);
          return;
        }

        timer = window.setTimeout(loop, 2000);
      } catch (e) {
        // 保底：避免轮询直接打爆控制台
        // eslint-disable-next-line no-console
        console.error(e);
        timer = window.setTimeout(loop, 3000);
      }
    };

    loop();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      setPolling(false);
    };
  }, [open, documentId, refresh, stopAndCleanupAudioUrl, pollingRun]);

  // audioStatus=success 后拉取 blob，并生成 objectURL 供播放
  useEffect(() => {
    const audioStatus = doc?.audioStatus;
    if (!open || !documentId) return;
    if (audioStatus !== 'success') {
      stopAndCleanupAudioUrl();
      return;
    }

    let cancelled = false;

    const loadAudio = async () => {
      try {
        const blob = (await documentLibraryService.getAudioBlob(documentId)) as unknown as Blob;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        stopAndCleanupAudioUrl();
        objectUrlRef.current = url;
        setAudioUrl(url);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    loadAudio();

    return () => {
      cancelled = true;
    };
  }, [doc?.audioStatus, documentId, open, stopAndCleanupAudioUrl]);

  const onRetryGenerate = useCallback(async () => {
    if (!documentId) return;
    try {
      // 失败后我们会停止轮询；点重试时手动重启轮询。
      setPollingRun((x) => x + 1);
      const text = (editableText || doc?.extractedText || '').trim();
      if (!text) return;
      await documentLibraryService.generateAudioFromText(documentId, text);
      // 后端会把 audioStatus 重置为 processing；当前轮询会自然拉取到新的进度/文本。
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, [documentId, editableText, doc?.extractedText]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">音频预览</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-black/10 px-2 py-1 text-sm hover:bg-black/5"
                onClick={onClose}
              >
                关闭
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-3 space-y-4">
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-black/80"
                  style={{ width: `${Math.max(0, Math.min(100, Number(doc?.audioProgress ?? 0)))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <div>{doc?.audioStage ? `阶段：${doc.audioStage}` : '阶段：-'}</div>
                <div>{Number.isFinite(doc?.audioProgress) ? `${doc.audioProgress}%` : ''}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">提取文本</div>
              {doc?.audioStatus === 'processing' ? (
                <div className="mt-2 max-h-64 overflow-auto rounded border border-black/10 bg-white p-3 text-xs leading-5 whitespace-pre-wrap break-words">
                  {doc?.extractedText ? doc.extractedText : '正在提取/生成，请稍候...'}
                </div>
              ) : (
                <textarea
                  className="mt-2 max-h-64 w-full resize-y rounded border border-black/10 bg-white p-3 text-xs leading-5 whitespace-pre-wrap break-words outline-none focus-visible:ring-1 focus-visible:ring-black/20"
                  value={editableText}
                  onChange={(e) => {
                    setTextDirty(true);
                    setEditableText(e.target.value);
                  }}
                  placeholder="这里可以编辑要生成音频的文本"
                />
              )}
            </div>

            <div>
              <div className="text-sm font-medium">播放器</div>
              <div className="mt-2">
                {doc?.audioStatus === 'success' ? (
                  <AudioPlayer src={audioUrl} controls />
                ) : (
                  <Button type="button" variant="outline" disabled>
                    音频生成中，完成后可播放
                  </Button>
                )}
                {doc?.audioStatus === 'failed' && doc?.audioError ? (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-red-600">{doc.audioError}</div>
                    <Button type="button" variant="outline" onClick={onRetryGenerate}>
                      重试生成音频
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

