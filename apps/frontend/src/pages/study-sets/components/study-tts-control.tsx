import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from 'src/components/ui/button';
import { documentLibraryService } from 'src/composables/context-provider';
import type { AudioParamsSchema } from 'src/modules/document-library';
import {
  DOCUMENT_AUDIO_PROVIDER_OPTIONS,
  type AudioProvider,
} from 'src/pages/document-library/audio-provider-options';
import {
  ALL_PROVIDERS,
  type SelectedProvider,
} from 'src/pages/document-library/components/audio-preview-dialog.types';

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

type StudyTtsControlProps = {
  /** 要合成的纯文本（题干/原文等） */
  text: string;
  className?: string;
};

export function StudyTtsControl({ text, className }: StudyTtsControlProps) {
  const [schema, setSchema] = useState<AudioParamsSchema[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider>('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [advancedParams, setAdvancedParams] = useState<Record<string, string | number | boolean>>({});
  const [openSettings, setOpenSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objectUrlRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

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

  const onSpeak = async () => {
    if (!trimmedText || !configReady || loading) return;
    setError(null);
    setLoading(true);
    stopPlayback();
    try {
      const blob = await documentLibraryService.synthesizeSpeech({
        text: trimmedText.slice(0, 800),
        audioProvider: selectedProvider as AudioProvider,
        audioModel: selectedModel,
        audioVoiceId: selectedVoiceId || undefined,
        params: advancedParams,
      });
      if (blob.type === 'application/json') {
        const t = await blob.text();
        try {
          const j = JSON.parse(t) as { message?: string; error?: { message?: string } };
          setError(j?.error?.message ?? j?.message ?? '合成失败');
        } catch {
          setError('合成失败');
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const el = new Audio(url);
      audioRef.current = el;
      el.onended = () => stopPlayback();
      await el.play();
      persistConfig();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className ?? ''}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={!trimmedText || !configReady || loading || !schema.length}
          onClick={() => {
            void onSpeak();
          }}
        >
          {loading ? '生成中…' : '朗读'}
        </Button>
        <button
          type="button"
          className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
          onClick={() => setOpenSettings((o) => !o)}
        >
          模型
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
