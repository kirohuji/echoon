import { useMemo, useState } from 'react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { documentLibraryService } from 'src/composables/context-provider';
import {
  DOCUMENT_AUDIO_PROVIDER_OPTIONS,
  type AudioProvider,
} from '../audio-provider-options';

const steps = ['选择文件', '选择标签', '选择模型', '确认上传'];

type TagOption = { id: string; name: string };

type Props = {
  open: boolean;
  tags: TagOption[];
  onClose: () => void;
  onSuccess: () => void;
};

export function UploadWizardDialog({ open, tags, onClose, onSuccess }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [customText, setCustomText] = useState('');
  const [title, setTitle] = useState('');
  const [audioProvider, setAudioProvider] = useState<AudioProvider>('minimax');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerOptions = DOCUMENT_AUDIO_PROVIDER_OPTIONS[audioProvider];
  const selectedOption = providerOptions[selectedOptionIndex] || providerOptions[0];

  const canNext = useMemo(() => {
    if (activeStep === 0) return Boolean(file) || Boolean(customText.trim());
    return true;
  }, [activeStep, customText, file]);

  const reset = () => {
    setActiveStep(0);
    setFile(null);
    setCustomText('');
    setTitle('');
    setAudioProvider('minimax');
    setSelectedOptionIndex(0);
    setTagIds([]);
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleToggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!file && !customText.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name);
        formData.append('audioProvider', audioProvider);
        formData.append('audioModel', selectedOption.model);
        if (selectedOption.voiceId) {
          formData.append('audioVoiceId', selectedOption.voiceId);
        }
        formData.append('modelName', selectedOption.model);
        formData.append('tagIds', JSON.stringify(tagIds));
        await documentLibraryService.upload(formData);
      } else {
        await documentLibraryService.createText({
          title: title || 'custom-text',
          audioProvider,
          audioModel: selectedOption.model,
          audioVoiceId: selectedOption.voiceId,
          modelName: selectedOption.model,
          tagIds,
          text: customText,
        });
      }
      handleClose();
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? '上传失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-lg">
        <div className="border-b border-black/10 px-4 py-3 text-base font-semibold">上传资料</div>
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {steps.map((label, index) => (
              <div
                key={label}
                className={`rounded-full px-3 py-1 ${
                  index === activeStep ? 'bg-black text-white' : 'bg-black/5 text-black/70'
                }`}
              >
                {index + 1}. {label}
              </div>
            ))}
          </div>

          {activeStep === 0 ? (
            <div className="space-y-3">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <Input
                placeholder="资料标题（可选）"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="min-h-[120px] w-full resize-y rounded-md border border-black/20 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/40 focus-visible:ring-1 focus-visible:ring-black/20"
                placeholder="或直接输入文本（将用于生成音频）"
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
              />
              <div className="text-xs text-gray-500">
                选择了文件则以文件为准；未选择文件时将使用此文本生成音频。
              </div>
            </div>
          ) : null}

          {activeStep === 1 ? (
            <div className="max-h-60 space-y-2 overflow-auto rounded border border-black/10 p-2">
              {tags.length === 0 ? <div className="text-sm text-gray-500">暂无标签，请先创建标签。</div> : null}
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tagIds.includes(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                  />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-gray-500">厂商</div>
                <select
                  className="h-9 w-full rounded-md border border-black/20 px-3 text-sm"
                  value={audioProvider}
                  onChange={(event) => {
                    setAudioProvider(event.target.value as AudioProvider);
                    setSelectedOptionIndex(0);
                  }}
                >
                  <option value="minimax">Minimax</option>
                  <option value="cartesia">Cartesia</option>
                </select>
              </div>

              <div>
                <div className="mb-1 text-xs text-gray-500">模型 / 音色</div>
                <select
                  className="h-9 w-full rounded-md border border-black/20 px-3 text-sm"
                  value={selectedOptionIndex}
                  onChange={(event) => setSelectedOptionIndex(Number(event.target.value))}
                >
                  {providerOptions.map((item, index) => (
                    <option key={`${item.model}-${item.voiceId || 'default'}`} value={index}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-md border border-black/10 bg-black/[0.02] p-3 text-xs text-gray-600">
                <div>Provider：{audioProvider}</div>
                <div>Model：{selectedOption.model}</div>
                <div>Voice：{selectedOption.voiceLabel || selectedOption.voiceId || '默认'}</div>
              </div>
            </div>
          ) : null}

          {activeStep === 3 ? (
            <div className="space-y-2 text-sm">
              <div>文件：{file?.name || '-'}</div>
              <div>标题：{title || file?.name || 'custom-text'}</div>
              <div>厂商：{audioProvider}</div>
              <div>模型：{selectedOption.model}</div>
              <div>音色：{selectedOption.voiceLabel || selectedOption.voiceId || '默认'}</div>
              <div>标签：{tagIds.length} 个</div>
              {file ? null : <div className="text-xs text-gray-600">文本长度：{customText.trim().length} 字符</div>}
            </div>
          ) : null}

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 px-4 py-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          {activeStep > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveStep((prev) => prev - 1)}
              disabled={submitting}
            >
              上一步
            </Button>
          ) : null}
          {activeStep < steps.length - 1 ? (
            <Button type="button" onClick={() => setActiveStep((prev) => prev + 1)} disabled={!canNext || submitting}>
              下一步
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || (!file && !customText.trim())}
            >
              {submitting ? '上传中...' : '提交'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
