import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { documentLibraryService } from 'src/composables/context-provider';
import { cn } from 'src/lib/utils';
import type { AudioParamsSchema, WordLookupDefinition } from 'src/modules/document-library';
import {
  DOCUMENT_AUDIO_PROVIDER_OPTIONS,
  type AudioProvider,
} from '../audio-provider-options';
import { AudioPreviewPlayer } from './audio-preview-player';

type WordTimestamp = {
  start_time: number;
  text: string;
};

type AudioPreviewDocument = {
  audioProvider?: AudioProvider | null;
  audioModel?: string | null;
  modelName?: string | null;
  audioVoiceId?: string | null;
  audioError?: string | null;
  audioProgress?: number | null;
  audioStage?: string | null;
  audioStatus?: 'pending' | 'processing' | 'success' | 'failed' | null;
  extractedText?: string | null;
  wordTimestamps?: WordTimestamp[] | null;
};

type AudioPreviewDialogProps = {
  open: boolean;
  documentId: string | null;
  onClose: () => void;
};

const ALL_PROVIDERS: AudioProvider[] = ['minimax', 'cartesia', 'hume', 'elevenlabs', 'deepgram'];

type SelectedProvider = AudioProvider | '';

export function AudioPreviewDialog({ open, documentId, onClose }: AudioPreviewDialogProps) {
  const [doc, setDoc] = useState<AudioPreviewDocument | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const [pollingRun, setPollingRun] = useState(0);
  const [editableText, setEditableText] = useState<string>('');
  const [textDirty, setTextDirty] = useState(false);
  const [schema, setSchema] = useState<AudioParamsSchema[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [advancedParams, setAdvancedParams] = useState<Record<string, string | number | boolean>>({});
  const [audioConfigDirty, setAudioConfigDirty] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [selectedLookupWord, setSelectedLookupWord] = useState('');
  const [lookupCandidates, setLookupCandidates] = useState<string[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupDefinitions, setLookupDefinitions] = useState<WordLookupDefinition[]>([]);

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

  // 把提取文本同步到可编辑文本：processing 阶段不覆盖用户输入
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

  // 当重新开始生成时，清空“已手动编辑”的标记
  useEffect(() => {
    if (doc?.audioStatus === 'processing') {
      setTextDirty(false);
      setEditableText(doc?.extractedText ?? '');
    }
  }, [doc?.audioStatus]);

  // 仅在 generating 时轮询；pending 表示尚未开始生成，不应每 2s 打接口。
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
        if (status !== 'processing') {
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

  const providerSchema =
    selectedProvider !== ''
      ? schema.find((item) => item.provider === selectedProvider)
      : undefined;
  const modelSchema =
    providerSchema?.models.find((item) => item.model === selectedModel) ??
    (selectedProvider !== '' ? providerSchema?.models[0] : undefined);
  const providerVoiceOptions =
    selectedProvider !== '' ? DOCUMENT_AUDIO_PROVIDER_OPTIONS[selectedProvider] || [] : [];
  const voiceOptions = providerVoiceOptions.filter(
    (item) => item.model === (selectedModel || modelSchema?.model)
  );
  const requiresVoiceId = Boolean(modelSchema?.requiresVoiceId);
  const canRegenerate = doc?.audioStatus !== 'processing';
  const providerLabel =
    selectedProvider !== '' ? selectedProvider : doc?.audioProvider ?? '未配置';
  const modelLabel =
    selectedModel || doc?.audioModel || doc?.modelName || '未配置';
  const voiceLabel = selectedVoiceId || doc?.audioVoiceId || '默认';
  const synthesisTextTrimmed = (editableText || doc?.extractedText || '').trim();
  const audioConfigReady = Boolean(
    selectedProvider !== '' &&
      selectedModel &&
      (!requiresVoiceId || Boolean(selectedVoiceId))
  );
  const canStartSynthesis = audioConfigReady && Boolean(synthesisTextTrimmed);

  const onRetryGenerate = useCallback(async () => {
    if (!documentId) return;
    try {
      const text = (editableText || doc?.extractedText || '').trim();
      if (!text) return;
      if (!selectedProvider || !selectedModel) return;
      if (requiresVoiceId && !selectedVoiceId) return;
      await documentLibraryService.generateAudioFromText(documentId, {
        text,
        audioProvider: selectedProvider as AudioProvider,
        audioModel: selectedModel || undefined,
        audioVoiceId: selectedVoiceId || undefined,
        params: advancedParams,
      });
      // 请求成功后再 bump：后端已是 processing，轮询 effect 拉到的第一条就是进行中，避免仍显示 pending 时误停轮询。
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
    requiresVoiceId,
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

  useEffect(() => {
    if (!selectedLookupWord && !lookupCandidates.length) {
      setLookupDefinitions([]);
      setLookupError('');
      setLookupLoading(false);
      return;
    }

    let cancelled = false;
    setLookupLoading(true);
    setLookupError('');
    setLookupDefinitions([]);
    const tryLookup = async () => {
      const queue = [...lookupCandidates, selectedLookupWord].filter(Boolean);
      for (const target of queue) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const res: any = await documentLibraryService.lookupWord(target);
          if (cancelled) return;
          const payload = (res?.data ?? res) as { word?: string; definitions?: WordLookupDefinition[] };
          const defs = Array.isArray(payload?.definitions) ? payload.definitions : [];
          if (defs.length > 0) {
            setSelectedLookupWord(String(payload?.word || target));
            setLookupDefinitions(defs);
            return;
          }
        } catch {
          // try next candidate
        }
      }
      if (cancelled) return;
      setLookupError('未找到释义');
      setLookupDefinitions([]);
    };

    void tryLookup().finally(() => {
      if (cancelled) return;
      setLookupLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedLookupWord, lookupCandidates]);

  const isAudioProcessing = doc?.audioStatus === 'processing';

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
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg bg-white p-4 shadow-lg"
          aria-busy={isAudioProcessing}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dialog.Title className="text-base font-semibold">音频管理</Dialog.Title>
              {isAudioProcessing ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  生成中
                </span>
              ) : null}
            </div>
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
            <div
              className={cn(
                'rounded-lg border p-3 transition-colors',
                isAudioProcessing ? 'border-blue-200 bg-blue-50/60' : 'border-transparent'
              )}
            >
              {isAudioProcessing ? (
                <div className="mb-2 flex items-center gap-2 text-sm text-blue-950">
                  <Iconify icon="svg-spinners:ring-resize" width={22} className="shrink-0 text-blue-600" />
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
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <div className={cn(isAudioProcessing && 'font-medium text-blue-900')}>
                  {doc?.audioStage ? `阶段：${doc.audioStage}` : '阶段：-'}
                </div>
                <div className={cn(isAudioProcessing && 'tabular-nums text-blue-900')}>
                  {Number.isFinite(doc?.audioProgress ?? null) ? `${doc?.audioProgress ?? 0}%` : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2">
                  <div className="text-sm font-medium">提取文本</div>
                  <button
                    type="button"
                    className="text-xs text-gray-600 underline underline-offset-2"
                    onClick={() => setShowExtractedText((prev) => !prev)}
                  >
                    {showExtractedText ? '折叠' : '展开'}
                  </button>
                </div>
                {showExtractedText ? (
                  doc?.audioStatus === 'processing' ? (
                    <div className="relative max-h-64 overflow-auto rounded border border-blue-200/80 bg-white p-3 text-xs leading-5 whitespace-pre-wrap break-words shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]">
                      <div className="pointer-events-none absolute inset-0 rounded bg-gradient-to-b from-blue-50/0 via-blue-50/40 to-blue-50/0 animate-pulse" />
                      <div className="relative flex min-h-[4rem] items-start gap-2">
                        <Iconify
                          icon="svg-spinners:3-dots-bounce"
                          width={20}
                          className="mt-0.5 shrink-0 text-blue-500"
                        />
                        <div>
                          <div className="font-medium text-blue-900">文本同步中</div>
                          <div className="mt-1 text-gray-600">
                            {doc?.extractedText ? doc.extractedText : '正在提取或等待合成，请稍候…'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : doc?.audioStatus === 'success' ? (
                    <div className="max-h-64 overflow-auto rounded border border-black/10 bg-white p-3 text-xs leading-5 whitespace-pre-wrap break-words text-gray-700">
                      {doc?.extractedText || '暂无文本'}
                    </div>
                  ) : (
                    <textarea
                      className="max-h-64 w-full resize-y rounded border border-black/10 bg-white p-3 text-xs leading-5 whitespace-pre-wrap break-words outline-none focus-visible:ring-1 focus-visible:ring-black/20"
                      value={editableText}
                      onChange={(e) => {
                        setTextDirty(true);
                        setEditableText(e.target.value);
                      }}
                      placeholder="这里可以编辑要生成音频的文本"
                    />
                  )
                ) : null}

                {doc?.audioStatus === 'success' ? (
                  <AudioPreviewPlayer
                    audioUrl={audioUrl}
                    wordTimestamps={doc?.wordTimestamps}
                    audioProvider={doc?.audioProvider}
                    activeLookupWord={selectedLookupWord}
                    onWordLongPress={({ word, candidates }) => {
                      setSelectedLookupWord(word);
                      setLookupCandidates(candidates);
                    }}
                  />
                ) : (
                  <div
                    className={cn(
                      'rounded-lg border p-8 text-center',
                      doc?.audioStatus === 'processing'
                        ? 'border-blue-200 bg-gradient-to-b from-blue-50/80 to-white'
                        : 'border-dashed border-black/20'
                    )}
                  >
                    {doc?.audioStatus === 'processing' ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <Iconify
                            icon="svg-spinners:bars-rotate-fade"
                            width={40}
                            className="text-blue-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-blue-950">音频生成中</div>
                          <p className="text-xs text-blue-800/80 animate-pulse">
                            合成完成后将自动出现播放器，请稍候
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">当前无音频，配置右侧参数后可手动生成</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-black/10 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-700">单词查询</div>
                    {selectedLookupWord ? (
                      <button
                        type="button"
                        className="text-[11px] text-gray-500 underline underline-offset-2"
                        onClick={() => {
                          setSelectedLookupWord('');
                          setLookupCandidates([]);
                        }}
                      >
                        清空
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-gray-700">
                    {selectedLookupWord
                      ? `当前词：${selectedLookupWord}`
                      : doc?.wordTimestamps?.length
                        ? '在左侧歌词中长按单词进行查询'
                        : '无词级时间戳时无法在歌词中选词，请从正文复制单词后自行检索'}
                  </div>
                  <div className="mt-2 max-h-44 space-y-1 overflow-auto text-[11px] text-gray-600">
                    {lookupLoading ? <div>查询中...</div> : null}
                    {!lookupLoading && lookupError ? <div className="text-red-500">{lookupError}</div> : null}
                    {!lookupLoading && !lookupError && selectedLookupWord && lookupDefinitions.length === 0 ? (
                      <div>未找到释义</div>
                    ) : null}
                    {!lookupLoading &&
                      !lookupError &&
                      lookupDefinitions.slice(0, 3).map((item, idx) => (
                        <div key={`${item.partOfSpeech}-${idx}`} className="rounded bg-gray-50 p-1.5">
                          <div className="font-medium text-gray-700">{item.partOfSpeech}</div>
                          <div>{item.gloss}</div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3">
                  <div className="text-xs font-semibold text-gray-700">当前音频配置</div>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <div>Provider：{providerLabel}</div>
                    <div>Model：{modelLabel}</div>
                    <div>Voice：{voiceLabel}</div>
                    <div>Status：{doc?.audioStatus || '-'}</div>
                  </div>
                </div>

                {doc?.audioStatus === 'failed' && doc?.audioError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                    {doc.audioError}
                  </div>
                ) : null}

                {canRegenerate ? (
                  <div className="space-y-2 rounded-md border border-black/10 bg-black/[0.02] p-3">
                    <div className="text-xs font-medium text-gray-700">音频控制台（重生参数）</div>
                    <div className="grid gap-2">
                      <select
                        className="h-9 rounded-md border border-black/20 bg-white px-2 text-xs"
                        value={selectedProvider}
                        onChange={(e) => {
                          setAudioConfigDirty(true);
                          const raw = e.target.value;
                          if (!raw) {
                            setSelectedProvider('');
                            setSelectedModel('');
                            setSelectedVoiceId('');
                            setAdvancedParams({});
                            return;
                          }
                          const provider = raw as AudioProvider;
                          const nextSchema = schema.find((item) => item.provider === provider);
                          const nextModel = nextSchema?.models[0]?.model || '';
                          setSelectedProvider(provider);
                          setSelectedModel(nextModel);
                          setSelectedVoiceId('');
                          const defaults: Record<string, string | number | boolean> = {};
                          nextSchema?.models[0]?.fields.forEach((field) => {
                            if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue;
                          });
                          setAdvancedParams(defaults);
                        }}
                      >
                        <option value="">请选择 TTS 提供商</option>
                        {ALL_PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-md border border-black/20 bg-white px-2 text-xs"
                        value={selectedModel}
                        disabled={selectedProvider === ''}
                        onChange={(e) => {
                          setAudioConfigDirty(true);
                          const nextModel = e.target.value;
                          setSelectedModel(nextModel);
                          const nextModelSchema = providerSchema?.models.find((item) => item.model === nextModel);
                          const defaults: Record<string, string | number | boolean> = {};
                          nextModelSchema?.fields.forEach((field) => {
                            if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue;
                          });
                          setAdvancedParams(defaults);
                        }}
                      >
                        {selectedProvider === '' ? (
                          <option value="">请先选择提供商</option>
                        ) : null}
                        {(providerSchema?.models || []).map((item) => (
                          <option key={item.model} value={item.model}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-md border border-black/20 bg-white px-2 text-xs"
                        value={selectedVoiceId}
                        disabled={selectedProvider === '' || !selectedModel}
                        onChange={(e) => {
                          setAudioConfigDirty(true);
                          setSelectedVoiceId(e.target.value);
                        }}
                      >
                        <option value="">{requiresVoiceId ? '请选择人声' : '默认人声'}</option>
                        {voiceOptions.map((item) => (
                          <option key={`${item.model}-${item.voiceId || 'default'}`} value={item.voiceId || ''}>
                            {item.voiceLabel || item.voiceId || item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {modelSchema?.fields?.length ? (
                      <div className="grid gap-2">
                        {modelSchema.fields.map((field) => (
                          <label key={field.key} className="space-y-1 text-xs text-gray-600">
                            <div>{field.label}</div>
                            {field.type === 'select' ? (
                              <select
                                className="h-8 w-full rounded-md border border-black/20 bg-white px-2"
                                value={String(advancedParams[field.key] ?? field.defaultValue ?? '')}
                                onChange={(e) =>
                                  setAdvancedParams((prev) => {
                                    setAudioConfigDirty(true);
                                    return { ...prev, [field.key]: e.target.value };
                                  })
                                }
                              >
                                {(field.options || []).map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'boolean' ? (
                              <select
                                className="h-8 w-full rounded-md border border-black/20 bg-white px-2"
                                value={String(advancedParams[field.key] ?? field.defaultValue ?? false)}
                                onChange={(e) =>
                                  setAdvancedParams((prev) => {
                                    setAudioConfigDirty(true);
                                    return {
                                      ...prev,
                                      [field.key]: e.target.value === 'true',
                                    };
                                  })
                                }
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                className="h-8 w-full rounded-md border border-black/20 px-2"
                                value={String(advancedParams[field.key] ?? field.defaultValue ?? '')}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const value = field.type === 'number' ? Number(raw) : raw;
                                  setAudioConfigDirty(true);
                                  setAdvancedParams((prev) => ({ ...prev, [field.key]: value }));
                                }}
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-1">
                      {!synthesisTextTrimmed ? (
                        <div className="text-[11px] text-amber-700">请先在「提取文本」中填写或确认有正文，再生成音频。</div>
                      ) : null}
                      {synthesisTextTrimmed && !audioConfigReady ? (
                        <div className="text-[11px] text-amber-700">
                          请选择 TTS 提供商、模型{requiresVoiceId ? '与人声' : ''}后再生成。
                        </div>
                      ) : null}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onRetryGenerate}
                        disabled={!canStartSynthesis}
                        title={
                          !synthesisTextTrimmed
                            ? '提取文本为空'
                            : !audioConfigReady
                              ? '请完成 TTS 配置'
                              : undefined
                        }
                      >
                        {doc?.audioStatus === 'success' ? '重新生成音频' : '生成音频'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onGenerateTranslation}
                        disabled={
                          doc?.audioStatus !== 'success' || !doc?.wordTimestamps?.length
                        }
                        title={
                          !doc?.wordTimestamps?.length
                            ? '需要词级时间戳才能按句写入中文翻译（MiniMax 等提供商不提供）'
                            : undefined
                        }
                      >
                        生成翻译
                      </Button>
                    </div>
                    </div>
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

