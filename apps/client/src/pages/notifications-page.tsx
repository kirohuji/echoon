import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppButton } from '../components/app/app-button';
import { SectionHeading } from '../components/app/section-heading';
import { SurfaceCard } from '../components/app/surface-card';
import { profileService } from '../features/profile/profile-service';
import { useAppStore } from '../store/app-store';

export function NotificationsPage() {
  const user = useAppStore((s) => s.user);
  const notifications = useAppStore((s) => s.notifications);
  const refreshGlobal = useAppStore((s) => s.refreshGlobal);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('## 通知标题\n\n- 支持 **Markdown**\n- 支持上传图片');
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => body || '*请输入通知内容*', [body]);

  const onSubmit = async () => {
    if (!user?.id || !title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await profileService.createNotification({
        userId: user.id,
        title,
        body,
        image,
      });
      setTitle('');
      setBody('');
      setImage(null);
      await refreshGlobal();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SurfaceCard className="p-4">
        <SectionHeading title="消息通知管理" desc="支持图片上传和 Markdown 编辑（客户端）" />
        <div className="space-y-3">
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="通知标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-48 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Markdown 内容"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          <AppButton tone="primary" disabled={saving} onClick={onSubmit}>
            {saving ? '发布中...' : '发布通知'}
          </AppButton>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <SectionHeading title="Markdown 预览" />
        <article className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
        </article>
      </SurfaceCard>

      <SurfaceCard className="p-4 lg:col-span-2">
        <SectionHeading title="最近通知" />
        <div className="grid gap-3 md:grid-cols-2">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
              {n.imageUrl ? <p className="mt-1 text-xs text-slate-500">图片：{n.imageUrl}</p> : null}
              <article className="prose prose-sm mt-2 max-w-none text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.body}</ReactMarkdown>
              </article>
            </div>
          ))}
          {notifications.length === 0 ? <p className="text-sm text-slate-500">暂无通知</p> : null}
        </div>
      </SurfaceCard>
    </div>
  );
}

