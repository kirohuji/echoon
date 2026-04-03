import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { Iconify } from 'src/components/iconify';
import { documentLibraryService } from 'src/composables/context-provider';
import { cn } from 'src/lib/utils';
import {
  parseWordLookupResponse,
  type AudioParamsSchema,
  type WordLookupDefinition,
} from 'src/modules/document-library';
import { AudioTtsSidebar } from './audio-preview-tts-sidebar';
import {
  isVideoDocument,
  type AudioPreviewDocument,
  type SelectedProvider,
} from './audio-preview-dialog.types';
import { WordLookupSidebar } from './audio-preview-word-lookup-sidebar';
import type { AudioProvider } from '../audio-provider-options';
import { AudioDocumentPanel } from './audio-document-panel';
import { VideoDocumentPanel } from './video-document-panel';

type AudioPreviewDialogProps = {
  open: boolean;
  documentId: string | null;
  onClose: () => void;
};

export function AudioPreviewDialog({ open, documentId, onClose }: AudioPreviewDialogProps) {
  const [doc, setDoc] = useState<AudioPreviewDocument | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [pollingRun, setPollingRun] = useState(0);
  const [editableText, setEditableText] = useState<string>('');
  const [textDirty, setTextDirty] = useState(false);
  const [schema, setSchema] = useState<AudioParamsSchema[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [advancedParams, setAdvancedParams] = useState<Record<string, string | number | boolean>>({});
  const [audioConfigDirty, setAudioConfigDirty] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedLookupWord, setSelectedLookupWord] = useState('');
  const [lookupCandidates, setLookupCandidates] = useState<string[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupDefinitions, setLookupDefinitions] = useState<WordLookupDefinition[]>([]);
  const [actionError, setActionError] = useState('');
  const [videoAnalyzingPending, setVideoAnalyzingPending] = useState(false);
  const [videoWhisperTemperature, setVideoWhisperTemperature] = useState('0.2');
  const [videoSplitOnWord, setVideoSplitOnWord] = useState(true);

  const objectUrlRef = useRef<string>('');
  const videoObjectUrlRef = useRef<string>('');
  const videoAnalyzingPendingRef = useRef(false);
  const syncingFromAudioRef = useRef(false);
  const syncingFromVideoRef = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [videoSyncSignal, setVideoSyncSignal] = useState({
    nonce: 0,
    time: 0,
    isPlaying: false,
    playbackRate: 1,
  });

  const stopAndCleanupAudioUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setAudioUrl('');
  }, []);

  const stopAndCleanupVideoUrl = useCallback(() => {
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = '';
    }
    setVideoUrl('');
  }, []);

  const refresh = useCallback(async () => {
    if (!documentId) return null;
    const res = await documentLibraryService.get({ id: documentId });
    return (res?.data ?? null) as AudioPreviewDocument | null;
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    documentLibraryService
      .getAudioParamsSchema()
      .then((res) => {
        const payload = (res as any)?.data ?? res;
        setSchema(Array.isArray(payload) ? (payload as AudioParamsSchema[]) : []);
      })
      .catch(() => setSchema([]));
  }, [open]);

  useEffect(() => {
    if (!doc) return;
    if (doc?.audioStatus === 'processing') return;
    if (textDirty) return;
    setEditableText(doc?.extractedText ?? '');
  }, [doc, textDirty]);

  useEffect(() => {
    if (!doc || audioConfigDirty) return;
    if (!doc.audioProvider) {
      setSelectedProvider('');
      setSelectedModel('');
      setSelectedVoiceId(doc.audioVoiceId || '');
      setAdvancedParams({});
      return;
    }
    const provider = doc.audioProvider as AudioProvider;
    const docProviderSchema = schema.find((item) => item.provider === provider);
    const model =
      doc.audioModel || doc.modelName || docProviderSchema?.models[0]?.model || '';
    const matchedModel = docProviderSchema?.models.find((item) => item.model === model);
    setSelectedProvider(provider);
    setSelectedModel(model);
    setSelectedVoiceId(doc.audioVoiceId || '');
    const defaults: Record<string, string | number | boolean> = {};
    matchedModel?.fields.forEach((field) => {
      if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue;
    });
    setAdvancedParams(defaults);
  }, [
    doc?.audioProvider,
    doc?.audioModel,
    doc?.modelName,
    doc?.audioVoiceId,
    schema,
    doc,
    audioConfigDirty,
  ]);

  useEffect(() => {
    if (open) return;
    setAudioConfigDirty(false);
  }, [open]);

  useEffect(() => {
    setAudioConfigDirty(false);
  }, [documentId]);

  useEffect(() => {
    if (doc?.audioStatus === 'processing') {
      setTextDirty(false);
      setEditableText(doc?.extractedText ?? '');
    }
  }, [doc?.audioStatus, doc?.extractedText]);

  useEffect(() => {
    if (!open || !documentId) {
      setDoc(null);
      stopAndCleanupAudioUrl();
      stopAndCleanupVideoUrl();
      return () => {};
    }

    let cancelled = false;
    let timer: number | undefined;

    const loop = async (): Promise<void> => {
      try {
        const data = await refresh();
        if (cancelled) return;
        setDoc(data);

        const status = data?.audioStatus;
        if (status === 'success' || status === 'failed') {
          return;
        }
        if (status === 'pending' && videoAnalyzingPendingRef.current) {
          timer = window.setTimeout(loop, 1200);
          return;
        }
        if (status !== 'processing') {
          return;
        }

        timer = window.setTimeout(loop, 2000);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        timer = window.setTimeout(loop, 3000);
      }
    };

    loop();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [open, documentId, refresh, stopAndCleanupAudioUrl, stopAndCleanupVideoUrl, pollingRun]);

  useEffect(() => {
    const audioStatus = doc?.audioStatus;
    if (!open || !documentId) {
      return () => {};
    }
    if (audioStatus !== 'success') {
      stopAndCleanupAudioUrl();
      return () => {};
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

  useEffect(() => {
    if (!open || !documentId) {
      return () => {};
    }
    const mime = doc?.mimeType || '';
    const ext = (doc?.fileType || '').toLowerCase();
    const isVideo = mime.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'].includes(ext);
    if (!isVideo) {
      stopAndCleanupVideoUrl();
      return () => {};
    }
    let cancelled = false;
    const loadVideo = async () => {
      try {
        const blob = (await documentLibraryService.getVideoBlob(documentId)) as unknown as Blob;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        stopAndCleanupVideoUrl();
        videoObjectUrlRef.current = url;
        setVideoUrl(url);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };
    loadVideo();
    return () => {
      cancelled = true;
    };
  }, [documentId, doc?.fileType, doc?.mimeType, open, stopAndCleanupVideoUrl]);

  const canRegenerate = doc?.audioStatus !== 'processing';

  const onRetryGenerate = useCallback(async () => {
    if (!documentId) return;
    try {
      const text = (editableText || doc?.extractedText || '').trim();
      if (!text) return;
      if (!selectedProvider || !selectedModel) return;

      const requiresVoiceId = Boolean(
        schema
          .find((item) => item.provider === selectedProvider)
          ?.models.find((m) => m.model === selectedModel)?.requiresVoiceId
      );
      if (requiresVoiceId && !selectedVoiceId) return;

      await documentLibraryService.generateAudioFromText(documentId, {
        text,
        audioProvider: selectedProvider as AudioProvider,
        audioModel: selectedModel || undefined,
        audioVoiceId: selectedVoiceId || undefined,
        params: advancedParams,
      });
      setPollingRun((x) => x + 1);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, [
    documentId,
    editableText,
    doc?.extractedText,
    selectedProvider,
    selectedModel,
    selectedVoiceId,
    advancedParams,
    schema,
  ]);

  const onGenerateTranslation = useCallback(async () => {
    if (!documentId) return;
    try {
      await documentLibraryService.generateTranslation(documentId);
      setPollingRun((x) => x + 1);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, [documentId]);

  const onTranscribeVideo = useCallback(async () => {
    if (!documentId) return;
    try {
      setVideoAnalyzingPending(true);
      setActionError('');
      setDoc((prev) =>
        prev
          ? {
              ...prev,
              audioStatus: 'processing',
              audioStage: 'transcribing_video',
              audioProgress: Math.max(1, Number(prev.audioProgress ?? 0)),
            }
          : prev
      );
      setPollingRun((x) => x + 1);
      const parsedTemperature = Number(videoWhisperTemperature);
      const requestPayload =
        Number.isFinite(parsedTemperature) && parsedTemperature >= 0 && parsedTemperature <= 1
          ? { whisperTemperature: parsedTemperature, whisperSplitOnWord: videoSplitOnWord }
          : { whisperSplitOnWord: videoSplitOnWord };
      const res: any = await documentLibraryService.transcribeVideo(documentId, requestPayload);
      const responsePayload = res?.data ?? null;
      if (responsePayload && typeof responsePayload === 'object') {
        setDoc(responsePayload as AudioPreviewDocument);
      }
      setPollingRun((x) => x + 1);
    } catch (e: any) {
      setVideoAnalyzingPending(false);
      const message =
        e?.response?.data?.error?.message ||
        e?.message ||
        '视频分析失败，请稍后重试';
      setActionError(String(message));
      window.alert(String(message));
    }
  }, [documentId, videoWhisperTemperature, videoSplitOnWord]);

  useEffect(() => {
    videoAnalyzingPendingRef.current = videoAnalyzingPending;
  }, [videoAnalyzingPending]);

  useEffect(() => {
    if (!videoAnalyzingPending) {
      return () => {};
    }
    if (
      doc?.audioStatus === 'processing' ||
      doc?.audioStatus === 'success' ||
      doc?.audioStatus === 'failed'
    ) {
      setVideoAnalyzingPending(false);
    }
    return () => {};
  }, [videoAnalyzingPending, doc?.audioStatus]);

  useEffect(() => {
    if (!selectedLookupWord && !lookupCandidates.length) {
      setLookupDefinitions([]);
      setLookupError('');
      setLookupLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLookupLoading(true);
    setLookupError('');
    setLookupDefinitions([]);
    const tryLookup = async () => {
      const queue = [...lookupCandidates, selectedLookupWord].filter(Boolean);
      try {
        const raw = await documentLibraryService.lookupWordCandidates(queue);
        if (cancelled) return;
        const payload = parseWordLookupResponse(raw);
        const defs = payload?.definitions ?? [];
        if (defs.length > 0) {
          setSelectedLookupWord(String(payload?.word || selectedLookupWord));
          setLookupDefinitions(defs);
          return;
        }
      } catch {
        // ignore
      }
      if (cancelled) return;
      setLookupError('未找到释义');
      setLookupDefinitions([]);
    };

    tryLookup().finally(() => {
      if (cancelled) return;
      setLookupLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedLookupWord, lookupCandidates]);

  const isAudioProcessing = doc?.audioStatus === 'processing';
  const isVideoDoc = isVideoDocument(doc);
  const isVideoAnalyzing = isVideoDoc && (isAudioProcessing || videoAnalyzingPending);

  const onWordLongPress = useCallback((payload: { word: string; candidates: string[] }) => {
    setSelectedLookupWord(payload.word);
    setLookupCandidates(payload.candidates);
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(98vw,72rem)] max-w-[72rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-3 shadow-xl shadow-slate-200/50 sm:p-3.5"
          aria-busy={isAudioProcessing}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Dialog.Title className="truncate text-sm font-semibold text-slate-900">
                {isVideoDoc ? '视频管理' : '音频管理'}
              </Dialog.Title>
              {isAudioProcessing ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </span>
                  生成中
                </span>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                onClick={onClose}
              >
                关闭
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-2.5 space-y-2.5">
            <div
              className={cn(
                'rounded-lg border px-2.5 py-2 transition-colors',
                isAudioProcessing ? 'border-blue-200/90 bg-blue-50/70' : 'border-slate-100 bg-slate-50/40'
              )}
            >
              {isAudioProcessing ? (
                <div className="mb-1.5 flex items-center gap-2 text-xs text-blue-950">
                  <Iconify icon="svg-spinners:ring-resize" width={18} className="shrink-0 text-blue-600" />
                  <span>正在处理，请勿关闭窗口…</span>
                </div>
              ) : null}
              <div
                className={cn(
                  'h-2.5 w-full overflow-hidden rounded-full bg-black/10',
                  isAudioProcessing && 'ring-1 ring-blue-200/80'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r from-neutral-800 to-neutral-600 transition-[width] duration-700 ease-out',
                    isAudioProcessing && 'shadow-[0_0_12px_rgba(37,99,235,0.35)]'
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, Number(doc?.audioProgress ?? 0)))}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600">
                <div className={cn(isAudioProcessing && 'font-medium text-blue-900')}>
                  {doc?.audioStage ? `阶段：${doc.audioStage}` : '阶段：-'}
                </div>
                <div className={cn(isAudioProcessing && 'tabular-nums text-blue-900')}>
                  {Number.isFinite(doc?.audioProgress ?? null) ? `${doc?.audioProgress ?? 0}%` : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(14rem,16rem)]">
              {isVideoDoc ? (
                <VideoDocumentPanel
                  doc={doc}
                  videoUrl={videoUrl}
                  audioUrl={audioUrl}
                  videoElementRef={videoElementRef}
                  videoWhisperTemperature={videoWhisperTemperature}
                  setVideoWhisperTemperature={setVideoWhisperTemperature}
                  videoSplitOnWord={videoSplitOnWord}
                  setVideoSplitOnWord={setVideoSplitOnWord}
                  onTranscribeVideo={onTranscribeVideo}
                  canRegenerate={canRegenerate}
                  isVideoAnalyzing={isVideoAnalyzing}
                  videoSyncSignal={videoSyncSignal}
                  setVideoSyncSignal={setVideoSyncSignal}
                  syncingFromAudioRef={syncingFromAudioRef}
                  syncingFromVideoRef={syncingFromVideoRef}
                  selectedLookupWord={selectedLookupWord}
                  onWordLongPress={onWordLongPress}
                />
              ) : (
                <AudioDocumentPanel
                  doc={doc}
                  audioUrl={audioUrl}
                  editableText={editableText}
                  onEditableTextChange={(v) => {
                    setTextDirty(true);
                    setEditableText(v);
                  }}
                  videoElementRef={videoElementRef}
                  videoSyncSignal={videoSyncSignal}
                  syncingFromAudioRef={syncingFromAudioRef}
                  syncingFromVideoRef={syncingFromVideoRef}
                  selectedLookupWord={selectedLookupWord}
                  onWordLongPress={onWordLongPress}
                />
              )}

              <div className="min-w-0 space-y-2">
                <WordLookupSidebar
                  doc={doc}
                  selectedLookupWord={selectedLookupWord}
                  lookupLoading={lookupLoading}
                  lookupError={lookupError}
                  lookupDefinitions={lookupDefinitions}
                  onClearLookup={() => {
                    setSelectedLookupWord('');
                    setLookupCandidates([]);
                  }}
                />

                {!isVideoDoc ? (
                  <AudioTtsSidebar
                    doc={doc}
                    canRegenerate={canRegenerate}
                    schema={schema}
                    selectedProvider={selectedProvider}
                    setSelectedProvider={setSelectedProvider}
                    setSelectedModel={setSelectedModel}
                    setSelectedVoiceId={setSelectedVoiceId}
                    setAdvancedParams={setAdvancedParams}
                    setAudioConfigDirty={setAudioConfigDirty}
                    selectedModel={selectedModel}
                    selectedVoiceId={selectedVoiceId}
                    advancedParams={advancedParams}
                    editableText={editableText}
                    onRetryGenerate={onRetryGenerate}
                    onGenerateTranslation={onGenerateTranslation}
                  />
                ) : null}

                {doc?.audioStatus === 'failed' && doc?.audioError ? (
                  <div className="rounded-md border border-red-200/90 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                    {doc.audioError}
                  </div>
                ) : null}
                {actionError ? (
                  <div className="rounded-md border border-red-200/90 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                    {actionError}
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
