import { useMemo, useState } from 'react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { documentLibraryService } from 'src/composables/context-provider';

const steps = ['选择文件', '选择标签', '选择模型', '确认上传'];
const modelOptions = ['gpt-4o-mini', 'gpt-4.1-mini', 'deepseek-chat'];

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
  const [title, setTitle] = useState('');
  const [modelName, setModelName] = useState(modelOptions[0]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (activeStep === 0) return Boolean(file);
    return true;
  }, [activeStep, file]);

  const reset = () => {
    setActiveStep(0);
    setFile(null);
    setTitle('');
    setModelName(modelOptions[0]);
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
    if (!file) return;

    try {
      setSubmitting(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('modelName', modelName);
      formData.append('tagIds', JSON.stringify(tagIds));
      await documentLibraryService.upload(formData);
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
            <select
              className="h-9 w-full rounded-md border border-black/20 px-3 text-sm"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
            >
              {modelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : null}

          {activeStep === 3 ? (
            <div className="space-y-2 text-sm">
              <div>文件：{file?.name}</div>
              <div>标题：{title || file?.name}</div>
              <div>模型：{modelName}</div>
              <div>标签：{tagIds.length} 个</div>
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
            <Button type="button" onClick={submit} disabled={submitting || !file}>
              {submitting ? '上传中...' : '提交'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
