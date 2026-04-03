import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { cn } from 'src/lib/utils';
import type { AudioParamsSchema } from 'src/modules/document-library';
import {
  DOCUMENT_AUDIO_PROVIDER_OPTIONS,
  type AudioProvider,
} from '../audio-provider-options';
import type { AudioPreviewDocument, SelectedProvider } from './audio-preview-dialog.types';
import { ALL_PROVIDERS } from './audio-preview-dialog.types';

type AudioTtsSidebarProps = {
  doc: AudioPreviewDocument | null;
  canRegenerate: boolean;
  schema: AudioParamsSchema[];
  selectedProvider: SelectedProvider;
  setSelectedProvider: (v: SelectedProvider) => void;
  setSelectedModel: (v: string) => void;
  setSelectedVoiceId: (v: string) => void;
  setAdvancedParams: (
    v: Record<string, string | number | boolean> | ((prev: Record<string, string | number | boolean>) => Record<string, string | number | boolean>)
  ) => void;
  setAudioConfigDirty: (v: boolean) => void;
  selectedModel: string;
  selectedVoiceId: string;
  advancedParams: Record<string, string | number | boolean>;
  editableText: string;
  onRetryGenerate: () => void;
  onGenerateTranslation: () => void;
};

export function AudioTtsSidebar({
  doc,
  canRegenerate,
  schema,
  selectedProvider,
  setSelectedProvider,
  setSelectedModel,
  setSelectedVoiceId,
  setAdvancedParams,
  setAudioConfigDirty,
  selectedModel,
  selectedVoiceId,
  advancedParams,
  editableText,
  onRetryGenerate,
  onGenerateTranslation,
}: AudioTtsSidebarProps) {
  const providerSchema =
    selectedProvider !== '' ? schema.find((item) => item.provider === selectedProvider) : undefined;
  const modelSchema =
    providerSchema?.models.find((item) => item.model === selectedModel) ??
    (selectedProvider !== '' ? providerSchema?.models[0] : undefined);
  const providerVoiceOptions =
    selectedProvider !== '' ? DOCUMENT_AUDIO_PROVIDER_OPTIONS[selectedProvider] || [] : [];
  const voiceOptions = providerVoiceOptions.filter(
    (item) => item.model === (selectedModel || modelSchema?.model)
  );
  const requiresVoiceId = Boolean(modelSchema?.requiresVoiceId);
  const providerLabel =
    selectedProvider !== '' ? selectedProvider : doc?.audioProvider ?? '未配置';
  const modelLabel = selectedModel || doc?.audioModel || doc?.modelName || '未配置';
  const voiceLabel = selectedVoiceId || doc?.audioVoiceId || '默认';
  const synthesisTextTrimmed = (editableText || doc?.extractedText || '').trim();
  const audioConfigReady = Boolean(
    selectedProvider !== '' && selectedModel && (!requiresVoiceId || Boolean(selectedVoiceId))
  );
  const canStartSynthesis = audioConfigReady && Boolean(synthesisTextTrimmed);

  return (
    <>
      <div
        className={cn(
          'rounded-lg border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-2.5',
          'shadow-sm ring-1 ring-black/[0.03]'
        )}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
          <Iconify icon="solar:settings-bold-duotone" width={16} className="text-slate-500" />
          当前音频配置
        </div>
        <dl className="mt-1.5 space-y-0.5 text-[10px] leading-tight text-slate-600">
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-slate-400">Provider</dt>
            <dd className="truncate text-right font-medium text-slate-800">{providerLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-slate-400">Model</dt>
            <dd className="truncate text-right font-medium text-slate-800">{modelLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-slate-400">Voice</dt>
            <dd className="truncate text-right font-medium text-slate-800">{voiceLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-slate-400">Status</dt>
            <dd className="font-medium text-slate-800">{doc?.audioStatus || '-'}</dd>
          </div>
        </dl>
      </div>

      {canRegenerate ? (
      <div
        className={cn(
          'space-y-1.5 rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-sm ring-1 ring-black/[0.03]'
        )}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
          <Iconify icon="solar:slider-horizontal-bold-duotone" width={16} className="text-indigo-500" />
          音频控制台
        </div>
        <div className="grid gap-1.5">
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30"
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
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30 disabled:opacity-50"
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
            {selectedProvider === '' ? <option value="">请先选择提供商</option> : null}
            {(providerSchema?.models || []).map((item) => (
              <option key={item.model} value={item.model}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30 disabled:opacity-50"
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
          <div className="grid gap-1.5">
            {modelSchema.fields.map((field) => {
              const fieldId = `tts-advanced-${field.key}`;
              return (
              <div key={field.key} className="space-y-0.5 text-[10px] text-slate-600">
                <label htmlFor={fieldId} className="block font-medium text-slate-700">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    id={fieldId}
                    className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30"
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
                    id={fieldId}
                    className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30"
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
                    id={fieldId}
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="h-7 w-full rounded-md border border-slate-200 px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30"
                    value={String(advancedParams[field.key] ?? field.defaultValue ?? '')}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const value = field.type === 'number' ? Number(rawValue) : rawValue;
                      setAudioConfigDirty(true);
                      setAdvancedParams((prev) => ({ ...prev, [field.key]: value }));
                    }}
                  />
                )}
              </div>
              );
            })}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          {!synthesisTextTrimmed ? (
            <div className="text-[10px] leading-snug text-amber-800">
              请先在「提取文本」中填写或确认有正文。
            </div>
          ) : null}
          {synthesisTextTrimmed && !audioConfigReady ? (
            <div className="text-[10px] leading-snug text-amber-800">
              请选择 TTS 提供商、模型{requiresVoiceId ? '与人声' : ''}。
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
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
              size="sm"
              className="h-8 text-xs"
              onClick={onGenerateTranslation}
              disabled={doc?.audioStatus !== 'success' || !doc?.wordTimestamps?.length}
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
    </>
  );
}
