import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SectionHeading } from '../components/app/section-heading';
import { SurfaceCard } from '../components/app/surface-card';
import { Button, FormField, Input, Textarea } from '../components/ui';
import { profileService } from '../features/profile/profile-service';
import { useAppStore } from '../store/app-store';

export function NotificationsPage() {
  const user = useAppStore((s) => s.user);
  const notifications = useAppStore((s) => s.notifications);
  const refreshNotifications = useAppStore((s) => s.refreshNotifications);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('## 通知标题\n\n- 支持 **Markdown**\n- 支持上传图片');
  const [targetUserId, setTargetUserId] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => body || '*请输入通知内容*', [body]);

  const onSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await profileService.createNotification({
        userId: targetUserId.trim() || user?.id || undefined,
        title,
        body,
        image,
      });
      setTitle('');
      setBody('');
      setImage(null);
      await refreshNotifications();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SurfaceCard className="p-4">
        <SectionHeading title="消息通知管理" desc="支持图片上传和 Markdown 编辑（客户端）" />
        <div className="space-y-3">
          <FormField label="通知标题" htmlFor="notification-title">
            <Input
              id="notification-title"
              placeholder="请输入标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label="接收用户 ID" htmlFor="target-user-id" hint="留空时默认全体用户">
            <Input
              id="target-user-id"
              placeholder="例如：u_1001"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </FormField>
          <FormField label="Markdown 内容" htmlFor="notification-body">
            <Textarea
              id="notification-body"
              className="min-h-48"
              placeholder="请输入 Markdown 内容"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </FormField>
          <FormField label="通知图片" htmlFor="notification-image" hint="可选，支持 image/*">
            <Input
              id="notification-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </FormField>
          <Button variant="primary" disabled={saving} onClick={onSubmit}>
            {saving ? '发布中...' : '发布通知'}
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <SectionHeading title="Markdown 预览" />
        <article className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
        </article>
      </SurfaceCard>

      <SurfaceCard className="p-4 lg:col-span-2">
        <SectionHeading title="最近通知" />
        <div className="grid gap-3 md:grid-cols-2">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
              {n.imageUrl ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">图片：{n.imageUrl}</p> : null}
              <article className="prose prose-sm mt-2 max-w-none text-slate-700 dark:prose-invert dark:text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.body}</ReactMarkdown>
              </article>
            </div>
          ))}
          {notifications.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">暂无通知</p> : null}
        </div>
      </SurfaceCard>
    </div>
  );
}

