import { useMemo, useState } from 'react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { documentLibraryService } from 'src/composables/context-provider';

const steps = ['选择文件', '选择标签', '确认上传'];

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
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (activeStep === 0) return Boolean(file) || Boolean(customText.trim());
    return true;
  }, [activeStep, customText, file]);

  const reset = () => {
    setActiveStep(0);
    setFile(null);
    setCustomText('');
    setTitle('');
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
        formData.append('tagIds', JSON.stringify(tagIds));
        await documentLibraryService.upload(formData);
      } else {
        await documentLibraryService.createText({
          title: title || 'custom-text',
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
                accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.mkv,.avi,.webm,.m4v"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <Input
                placeholder="资料标题（可选）"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="min-h-[120px] w-full resize-y rounded-md border border-black/20 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/40 focus-visible:ring-1 focus-visible:ring-black/20"
                placeholder="或直接输入文本（无文件时使用）"
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
              />
              <div className="text-xs text-gray-500">
                支持上传音频或视频；上传后会自动匹配“音频管理/视频管理”。
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
            <div className="space-y-2 text-sm">
              <div>文件：{file?.name || '-'}</div>
              <div>标题：{title || file?.name || 'custom-text'}</div>
              <div>模型与音频参数：上传后在对应管理面板中配置</div>
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
