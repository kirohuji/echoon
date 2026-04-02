import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { Button } from 'src/components/ui/button';
import { documentLibraryService } from 'src/composables/context-provider';
import type { AudioParamsSchema } from 'src/modules/document-library';
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

export function AudioPreviewDialog({ open, documentId, onClose }: AudioPreviewDialogProps) {
  const [doc, setDoc] = useState<AudioPreviewDocument | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const [pollingRun, setPollingRun] = useState(0);
  const [editableText, setEditableText] = useState<string>('');
  const [textDirty, setTextDirty] = useState(false);
  const [schema, setSchema] = useState<AudioParamsSchema[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AudioProvider>('minimax');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [advancedParams, setAdvancedParams] = useState<Record<string, string | number | boolean>>({});
  const [audioConfigDirty, setAudioConfigDirty] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);

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
    const provider = (doc.audioProvider ?? 'minimax') as AudioProvider;
    const providerSchema = schema.find((item) => item.provider === provider);
    const model = doc.audioModel || providerSchema?.models[0]?.model || '';
    const matchedModel = providerSchema?.models.find((item) => item.model === model);
    setSelectedProvider(provider);
    setSelectedModel(model);
    setSelectedVoiceId(doc.audioVoiceId || '');
    const defaults: Record<string, string | number | boolean> = {};
    matchedModel?.fields.forEach((field) => {
      if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue;
    });
    setAdvancedParams(defaults);
  }, [doc?.audioProvider, doc?.audioModel, doc?.audioVoiceId, schema, doc, audioConfigDirty]);

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

  const providerSchema = schema.find((item) => item.provider === selectedProvider);
  const modelSchema =
    providerSchema?.models.find((item) => item.model === selectedModel) || providerSchema?.models[0];
  const providerVoiceOptions = DOCUMENT_AUDIO_PROVIDER_OPTIONS[selectedProvider] || [];
  const voiceOptions = providerVoiceOptions.filter(
    (item) => item.model === (selectedModel || modelSchema?.model)
  );
  const requiresVoiceId = Boolean(modelSchema?.requiresVoiceId);
  const canRegenerate = doc?.audioStatus !== 'processing';
  const providerLabel = selectedProvider || doc?.audioProvider || '-';
  const modelLabel = selectedModel || doc?.audioModel || '-';
  const voiceLabel = selectedVoiceId || doc?.audioVoiceId || '默认';

  const onRetryGenerate = useCallback(async () => {
    if (!documentId) return;
    try {
      // 失败后我们会停止轮询；点重试时手动重启轮询。
      setPollingRun((x) => x + 1);
      const text = (editableText || doc?.extractedText || '').trim();
      if (!text) return;
      if (requiresVoiceId && !selectedVoiceId) return;
      await documentLibraryService.generateAudioFromText(documentId, {
        text,
        audioProvider: selectedProvider,
        audioModel: selectedModel || undefined,
        audioVoiceId: selectedVoiceId || undefined,
        params: advancedParams,
      });
      // 后端会把 audioStatus 重置为 processing；当前轮询会自然拉取到新的进度/文本。
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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">音频管理</Dialog.Title>
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
                <div>
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
                    <div className="max-h-64 overflow-auto rounded border border-black/10 bg-white p-3 text-xs leading-5 whitespace-pre-wrap break-words">
                      {doc?.extractedText ? doc.extractedText : '正在提取/生成，请稍候...'}
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
                  <AudioPreviewPlayer audioUrl={audioUrl} wordTimestamps={doc?.wordTimestamps} />
                ) : (
                  <div className="rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-gray-500">
                    {doc?.audioStatus === 'processing'
                      ? '音频生成中，完成后可播放'
                      : '当前无音频，配置右侧参数后可手动生成'}
                  </div>
                )}
              </div>

              <div className="space-y-3">
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
                          const provider = e.target.value as AudioProvider;
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
                        {ALL_PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-md border border-black/20 bg-white px-2 text-xs"
                        value={selectedModel}
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
                        {(providerSchema?.models || []).map((item) => (
                          <option key={item.model} value={item.model}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-md border border-black/20 bg-white px-2 text-xs"
                        value={selectedVoiceId}
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
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={onRetryGenerate}>
                        {doc?.audioStatus === 'success' ? '重新生成音频' : '生成音频'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onGenerateTranslation}
                        disabled={doc?.audioStatus !== 'success'}
                      >
                        生成翻译
                      </Button>
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

