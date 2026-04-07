import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Markdown from 'src/components/markdown/markdown';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { membershipService, notificationService, ticketService } from 'src/composables/context-provider';
import { useOpsStore } from 'src/stores/ops-store';

export default function OpsCenterPage() {
  const metadata = useMemo(() => ({ title: `运营中心 ${CONFIG.site.name}` }), []);
  const { memberships, notifications, tickets, refresh, startPolling, stopPolling, polling } = useOpsStore();

  const [activeTab, setActiveTab] = useState<'notification' | 'membership' | 'ticket'>('notification');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMarkdown, setNotifyMarkdown] = useState('## 新通知\n\n- 支持 **Markdown**\n- 可上传图片');
  const [notifyUserId, setNotifyUserId] = useState('');
  const [notifyImage, setNotifyImage] = useState<File | null>(null);

  const [memberUserId, setMemberUserId] = useState('');
  const [memberPlan, setMemberPlan] = useState('pro');
  const [memberStatus, setMemberStatus] = useState('active');
  const [memberBenefits, setMemberBenefits] = useState('AI批改,AI讲解,优先排队');

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const publishNotification = async () => {
    if (!notifyTitle.trim() || !notifyMarkdown.trim()) return;
    const form = new FormData();
    if (notifyUserId.trim()) form.append('userId', notifyUserId.trim());
    form.append('title', notifyTitle.trim());
    form.append('body', notifyMarkdown);
    if (notifyImage) form.append('image', notifyImage);
    await notificationService.createWithImage(form);
    await refresh();
  };

  const upsertMembership = async () => {
    if (!memberUserId.trim()) return;
    await membershipService.upsert({
      userId: memberUserId.trim(),
      plan: memberPlan.trim(),
      status: memberStatus.trim(),
      benefits: memberBenefits.split(',').map((s) => s.trim()).filter(Boolean),
    });
    await refresh();
  };

  const updateTicketStatus = async (id: string, status: string) => {
    await ticketService.updateStatus({ id, status });
    await refresh();
  };

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">运营中心</h1>
          <span className="text-xs text-slate-500">{polling ? '每分钟自动刷新中' : '轮询已停止'}</span>
          <Button variant="outline" onClick={() => void refresh()}>手动刷新</Button>
        </div>

        <div className="flex gap-2">
          <Button variant={activeTab === 'notification' ? 'default' : 'outline'} onClick={() => setActiveTab('notification')}>消息通知</Button>
          <Button variant={activeTab === 'membership' ? 'default' : 'outline'} onClick={() => setActiveTab('membership')}>会员管理</Button>
          <Button variant={activeTab === 'ticket' ? 'default' : 'outline'} onClick={() => setActiveTab('ticket')}>工单管理</Button>
        </div>

        {activeTab === 'notification' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 rounded border border-black/10 bg-white p-4">
              <h2 className="text-sm font-semibold">发布通知（Markdown + 图片）</h2>
              <Input placeholder="接收用户ID（留空=全体用户）" value={notifyUserId} onChange={(e) => setNotifyUserId(e.target.value)} />
              <Input placeholder="标题" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
              <textarea
                className="min-h-36 w-full rounded-md border border-black/20 p-2 text-sm"
                value={notifyMarkdown}
                onChange={(e) => setNotifyMarkdown(e.target.value)}
                placeholder="Markdown 内容"
              />
              <input type="file" accept="image/*" onChange={(e) => setNotifyImage(e.target.files?.[0] ?? null)} />
              <Button onClick={() => { void publishNotification(); }}>发布通知</Button>
            </div>
            <div className="rounded border border-black/10 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold">预览</h2>
              <Markdown>{notifyMarkdown}</Markdown>
            </div>
            <div className="rounded border border-black/10 bg-white p-4 lg:col-span-2">
              <h2 className="mb-2 text-sm font-semibold">通知列表</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {notifications.map((n) => (
                  <article key={n.id} className="rounded border border-black/10 p-3">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.imageUrl ? <p className="mt-1 text-xs text-slate-500">图片：{n.imageUrl}</p> : null}
                    <div className="mt-2 text-sm">
                      <Markdown>{n.body}</Markdown>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'membership' ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded border border-black/10 bg-white p-4">
              <h2 className="text-sm font-semibold">设置会员</h2>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="用户ID" value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} />
                <Input placeholder="套餐（free/pro/vip）" value={memberPlan} onChange={(e) => setMemberPlan(e.target.value)} />
                <Input placeholder="状态（active/paused）" value={memberStatus} onChange={(e) => setMemberStatus(e.target.value)} />
                <Input placeholder="权益，逗号分隔" value={memberBenefits} onChange={(e) => setMemberBenefits(e.target.value)} />
              </div>
              <Button onClick={() => { void upsertMembership(); }}>保存会员</Button>
            </div>
            <div className="overflow-x-auto rounded border border-black/10 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-black/5">
                  <tr><th className="px-3 py-2">用户</th><th className="px-3 py-2">套餐</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">权益</th></tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m.id} className="border-t border-black/10">
                      <td className="px-3 py-2">{m.userId}</td>
                      <td className="px-3 py-2">{m.plan}</td>
                      <td className="px-3 py-2">{m.status}</td>
                      <td className="px-3 py-2">{Array.isArray(m.benefits) ? m.benefits.join(' / ') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === 'ticket' ? (
          <div className="overflow-x-auto rounded border border-black/10 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/5">
                <tr><th className="px-3 py-2">主题</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">内容</th><th className="px-3 py-2">操作</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-black/10">
                    <td className="px-3 py-2">{t.subject}</td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2 max-w-[420px] truncate">{t.content}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { void updateTicketStatus(t.id, 'processing'); }}>处理中</Button>
                        <Button size="sm" variant="outline" onClick={() => { void updateTicketStatus(t.id, 'done'); }}>已完成</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}

