import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from 'src/components/ui/button';
import { documentLibraryService } from 'src/composables/context-provider';
import DocumentLibraryService, {
  type AudioParamsSchema,
  type SynthesizeSpeechWordTimestamp,
} from 'src/modules/document-library';
import {
  DOCUMENT_AUDIO_PROVIDER_OPTIONS,
  type AudioProvider,
} from 'src/pages/document-library/audio-provider-options';
import { AudioPreviewPlayer } from 'src/pages/document-library/components/audio-preview-player';
import {
  ALL_PROVIDERS,
  type SelectedProvider,
} from 'src/pages/document-library/components/audio-preview-dialog.types';

import { StudyPracticeTtsInline } from './study-practice-tts-inline';
import {
  deleteStudyTtsCached,
  getStudyTtsCached,
  setStudyTtsCached,
} from './study-tts-cache';

const LS_KEY = 'echoon-study-tts-prefs-v1';

type SavedPrefs = {
  selectedProvider: SelectedProvider;
  selectedModel: string;
  selectedVoiceId: string;
  advancedParams: Record<string, string | number | boolean>;
};

function loadPrefs(): Partial<SavedPrefs> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedPrefs;
  } catch {
    return null;
  }
}

function savePrefs(prefs: SavedPrefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function stableParamsKey(params: Record<string, string | number | boolean>) {
  const keys = Object.keys(params).sort();
  const sorted: Record<string, string | number | boolean> = {};
  keys.forEach((k) => {
    sorted[k] = params[k];
  });
  return JSON.stringify(sorted);
}

function makeTtsCacheKey(
  text: string,
  provider: string,
  model: string,
  voiceId: string,
  params: Record<string, string | number | boolean>,
) {
  // tts2：后端短时合成会走 whisper 补词时间戳，与旧缓存区分
  return [text, provider, model, voiceId, stableParamsKey(params), 'tts2'].join('\u0001');
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

type StudyTtsControlProps = {
  /** 要合成的纯文本（题干/原文等） */
  text: string;
  className?: string;
  /** 练习页：无波形、题干内逐词高亮 */
  variant?: 'default' | 'practice';
  /** 仅练习：显示在朗读文本前（如「请翻译：」），不参与 TTS */
  promptPrefix?: string;
};

export function StudyTtsControl({ text, className, variant = 'default', promptPrefix }: StudyTtsControlProps) {
  const [schema, setSchema] = useState<AudioParamsSchema[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider>('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [advancedParams, setAdvancedParams] = useState<Record<string, string | number | boolean>>({});
  const [openSettings, setOpenSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioUrl, setAudioUrl] = useState('');
  const [wordTimestamps, setWordTimestamps] = useState<SynthesizeSpeechWordTimestamp[] | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const objectUrlRef = useRef('');
  const loadedKeyRef = useRef<string | null>(null);
  const configSigRef = useRef<string | null>(null);

  const revokeAudioUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setAudioUrl('');
    setWordTimestamps(null);
    loadedKeyRef.current = null;
    setFromCache(false);
  }, []);

  useEffect(() => {
    revokeAudioUrl();
  }, [text, revokeAudioUrl]);

  useEffect(() => {
    const sig = `${selectedProvider}|${selectedModel}|${selectedVoiceId}|${stableParamsKey(advancedParams)}`;
    if (configSigRef.current !== null && configSigRef.current !== sig) {
      revokeAudioUrl();
    }
    configSigRef.current = sig;
  }, [selectedProvider, selectedModel, selectedVoiceId, advancedParams, revokeAudioUrl]);

  useEffect(() => {
    documentLibraryService
      .getAudioParamsSchema()
      .then((res) => {
        const payload = (res as { data?: unknown })?.data ?? res;
        setSchema(Array.isArray(payload) ? (payload as AudioParamsSchema[]) : []);
      })
      .catch(() => setSchema([]));
  }, []);

  useEffect(() => {
    if (!schema.length) return;
    const saved = loadPrefs();
    if (saved?.selectedProvider) {
      const prov = saved.selectedProvider;
      const provSchema = schema.find((s) => s.provider === prov);
      const model =
        saved.selectedModel && provSchema?.models.some((m) => m.model === saved.selectedModel)
          ? saved.selectedModel
          : provSchema?.models[0]?.model ?? '';
      const modelSchema = provSchema?.models.find((m) => m.model === model);
      const defaults: Record<string, string | number | boolean> = { ...(saved.advancedParams ?? {}) };
      modelSchema?.fields.forEach((field) => {
        if (defaults[field.key] === undefined && field.defaultValue !== undefined) {
          defaults[field.key] = field.defaultValue;
        }
      });
      setSelectedProvider(prov);
      setSelectedModel(model);
      setSelectedVoiceId(saved.selectedVoiceId ?? '');
      setAdvancedParams(defaults);
      return;
    }
    const first = schema[0];
    if (first?.models[0]) {
      setSelectedProvider(first.provider);
      setSelectedModel(first.models[0].model);
      setSelectedVoiceId('');
      const defaults: Record<string, string | number | boolean> = {};
      first.models[0].fields.forEach((field) => {
        if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue;
      });
      setAdvancedParams(defaults);
    }
  }, [schema]);

  const providerSchema =
    selectedProvider !== '' ? schema.find((item) => item.provider === selectedProvider) : undefined;
  const modelSchema =
    providerSchema?.models.find((item) => item.model === selectedModel) ??
    (selectedProvider !== '' ? providerSchema?.models[0] : undefined);
  const providerVoiceOptions =
    selectedProvider !== '' ? DOCUMENT_AUDIO_PROVIDER_OPTIONS[selectedProvider as AudioProvider] || [] : [];
  const voiceOptions = providerVoiceOptions.filter(
    (item) => item.model === (selectedModel || modelSchema?.model),
  );
  const requiresVoiceId = Boolean(modelSchema?.requiresVoiceId);
  const trimmedText = text.trim();
  const configReady = Boolean(
    selectedProvider && selectedModel && (!requiresVoiceId || Boolean(selectedVoiceId)),
  );

  const persistConfig = () => {
    if (!selectedProvider || !selectedModel) return;
    savePrefs({
      selectedProvider,
      selectedModel,
      selectedVoiceId,
      advancedParams,
    });
  };

  const applyPayload = useCallback(
    (key: string, payload: { mimeType: string; audioBase64: string; wordTimestamps: SynthesizeSpeechWordTimestamp[] | null }, cached: boolean) => {
      revokeAudioUrl();
      const blob = base64ToBlob(payload.audioBase64, payload.mimeType);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      loadedKeyRef.current = key;
      setAudioUrl(url);
      setWordTimestamps(payload.wordTimestamps);
      setFromCache(cached);
    },
    [revokeAudioUrl],
  );

  const ensureAudio = async (force = false) => {
    if (!trimmedText || !configReady || loading) return;
    const slice = trimmedText.slice(0, 800);
    const key = makeTtsCacheKey(
      slice,
      selectedProvider as string,
      selectedModel,
      selectedVoiceId,
      advancedParams,
    );

    if (!force && loadedKeyRef.current === key && objectUrlRef.current) {
      persistConfig();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (force) {
        deleteStudyTtsCached(key);
      }

      const cached = !force ? getStudyTtsCached(key) : undefined;
      if (cached) {
        applyPayload(key, cached, true);
        persistConfig();
        return;
      }

      const raw = await documentLibraryService.synthesizeSpeech({
        text: slice,
        audioProvider: selectedProvider as AudioProvider,
        audioModel: selectedModel,
        audioVoiceId: selectedVoiceId || undefined,
        params: advancedParams,
      });
      const data = DocumentLibraryService.unwrapSynthesizeSpeech(raw);
      setStudyTtsCached(key, data);
      applyPayload(key, data, false);
      persistConfig();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, []);

  return (
    <div className={className ?? ''}>
      {variant === 'practice' && !audioUrl && trimmedText ? (
        <p className="mb-3 text-lg font-medium leading-relaxed text-slate-800">
          {promptPrefix ? <span className="text-slate-600">{promptPrefix}</span> : null}
          {trimmedText}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={!trimmedText || !configReady || loading || !schema.length}
          onClick={() => {
            void ensureAudio(false);
          }}
        >
          {loading ? '加载中…' : audioUrl ? '已加载' : '加载音频'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs text-slate-600"
          disabled={!trimmedText || !configReady || loading || !schema.length}
          onClick={() => {
            void ensureAudio(true);
          }}
        >
          重新合成
        </Button>
        <button
          type="button"
          className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
          onClick={() => setOpenSettings((o) => !o)}
        >
          模型
        </button>
      </div>
      {fromCache && audioUrl ? (
        <p className="mt-1 text-[10px] text-slate-500">已使用本次会话缓存，未重复请求 TTS</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}

      {audioUrl ? (
        variant === 'practice' ? (
          <div className="mt-3 w-full rounded-xl border border-slate-200/90 bg-white p-4">
            <StudyPracticeTtsInline
              audioUrl={audioUrl}
              wordTimestamps={wordTimestamps}
              promptPrefix={promptPrefix}
              spokenText={text.trim()}
            />
          </div>
        ) : (
          <div className="mt-3 max-w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2">
            <AudioPreviewPlayer
              audioUrl={audioUrl}
              wordTimestamps={wordTimestamps}
              audioProvider={selectedProvider || null}
              embedFlexibleLyrics
              lyricContainerHeight={200}
            />
          </div>
        )
      ) : null}

      {openSettings ? (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-xs text-slate-800">
          <select
            className="h-8 w-full max-w-xs rounded-md border border-slate-200 bg-white px-2"
            value={selectedProvider}
            onChange={(e) => {
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
            <option value="">TTS 提供商</option>
            {ALL_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className="h-8 w-full max-w-xs rounded-md border border-slate-200 bg-white px-2 disabled:opacity-50"
            disabled={selectedProvider === ''}
            value={selectedModel}
            onChange={(e) => {
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
            className="h-8 w-full max-w-xs rounded-md border border-slate-200 bg-white px-2 disabled:opacity-50"
            value={selectedVoiceId}
            disabled={selectedProvider === '' || !selectedModel}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
          >
            <option value="">{requiresVoiceId ? '请选择人声' : '默认人声'}</option>
            {voiceOptions.map((item) => (
              <option key={`${item.model}-${item.voiceId || 'default'}`} value={item.voiceId || ''}>
                {item.voiceLabel || item.voiceId || item.label}
              </option>
            ))}
          </select>
          {modelSchema?.fields?.length ? (
            <div className="grid gap-2 border-t border-slate-200 pt-2">
              {modelSchema.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-0.5 block text-[11px] text-slate-600">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="h-7 w-full max-w-xs rounded border border-slate-200 bg-white px-2 text-[11px]"
                      value={String(advancedParams[field.key] ?? field.defaultValue ?? '')}
                      onChange={(e) =>
                        setAdvancedParams((prev) => ({ ...prev, [field.key]: e.target.value }))
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
                      className="h-7 w-full max-w-xs rounded border border-slate-200 bg-white px-2 text-[11px]"
                      value={String(advancedParams[field.key] ?? field.defaultValue ?? false)}
                      onChange={(e) =>
                        setAdvancedParams((prev) => ({
                          ...prev,
                          [field.key]: e.target.value === 'true',
                        }))
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      className="h-7 w-full max-w-xs rounded border border-slate-200 px-2 text-[11px]"
                      value={String(advancedParams[field.key] ?? field.defaultValue ?? '')}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const value = field.type === 'number' ? Number(rawValue) : rawValue;
                        setAdvancedParams((prev) => ({ ...prev, [field.key]: value }));
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={persistConfig}>
            记住当前配置
          </Button>
        </div>
      ) : null}
    </div>
  );
}
