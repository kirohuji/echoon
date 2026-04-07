import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import Markdown from 'src/components/markdown/markdown';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { membershipService, notificationService, ticketService } from 'src/composables/context-provider';
import { useOpsStore } from 'src/stores/ops-store';

export default function OpsCenterPage() {
  const metadata = useMemo(() => ({ title: `运营中心 ${CONFIG.site.name}` }), []);
  const { memberships, notifications, tickets, refresh, startPolling, stopPolling, polling } = useOpsStore();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'notification' | 'membership' | 'ticket'>('notification');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMarkdown, setNotifyMarkdown] = useState('## 新通知\n\n- 支持 **Markdown**\n- 可上传图片');
  const [notifyUserId, setNotifyUserId] = useState('');
  const [notifyImage, setNotifyImage] = useState<File | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyImagePreviewUrl, setNotifyImagePreviewUrl] = useState('');

  const [memberUserId, setMemberUserId] = useState('');
  const [memberPlan, setMemberPlan] = useState('pro');
  const [memberStatus, setMemberStatus] = useState('active');
  const [memberBenefits, setMemberBenefits] = useState('AI批改,AI讲解,优先排队');

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'membership' || section === 'ticket' || section === 'notification') {
      setActiveTab(section);
      return;
    }
    setActiveTab('notification');
  }, [searchParams]);

  useEffect(() => {
    if (!notifyImage) {
      setNotifyImagePreviewUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(notifyImage);
    setNotifyImagePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [notifyImage]);

  const publishNotification = async () => {
    if (!notifyTitle.trim() || !notifyMarkdown.trim()) return;
    const form = new FormData();
    if (notifyUserId.trim()) form.append('userId', notifyUserId.trim());
    form.append('title', notifyTitle.trim());
    form.append('body', notifyMarkdown);
    if (notifyImage) form.append('image', notifyImage);
    await notificationService.createWithImage(form);
    await refresh();
    setNotifyDialogOpen(false);
    setNotifyTitle('');
    setNotifyMarkdown('## 新通知\n\n- 支持 **Markdown**\n- 可上传图片');
    setNotifyUserId('');
    setNotifyImage(null);
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

  const setNotifyImageFromList = (files: FileList | null) => {
    const next = files?.[0] ?? null;
    if (!next) return;
    if (!next.type.startsWith('image/')) return;
    setNotifyImage(next);
  };

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">运营中心</h1>
            <p className="mt-1 text-sm text-slate-500">统一管理消息通知、会员配置与工单处理</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{polling ? '每分钟自动刷新中' : '轮询已停止'}</span>
            <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => void refresh()}>
              手动刷新
            </Button>
          </div>
        </div>

        <section className="min-w-0">
        {activeTab === 'notification' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-base font-semibold">消息通知</h2>
              <Button className="bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700" onClick={() => setNotifyDialogOpen(true)}>
                新增消息通知
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">标题</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">接收用户</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">内容</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">图片</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notifications.map((n: any) => (
                    <tr key={String(n.id)} className="bg-white align-top transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{String(n.title ?? '-')}</td>
                      <td className="px-4 py-3 text-slate-700">{String(n.userId ?? '全体用户')}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-[520px] text-slate-700">
                          <Markdown>{String(n.body ?? '')}</Markdown>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {n.imageUrl ? (
                          <a href={String(n.imageUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                            查看图片
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {notifyDialogOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <button
                  type="button"
                  className="absolute inset-0"
                  aria-label="关闭新增消息通知弹窗"
                  onClick={() => setNotifyDialogOpen(false)}
                />
                <div className="relative w-full max-w-5xl rounded-lg bg-white shadow-lg">
                  <div className="border-b border-black/10 px-4 py-3 text-base font-semibold">新增消息通知</div>
                  <div className="grid gap-4 px-4 py-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <Input
                        placeholder="接收用户ID（留空=全体用户）"
                        value={notifyUserId}
                        onChange={(e) => setNotifyUserId(e.target.value)}
                      />
                      <Input
                        placeholder="消息通知标题"
                        value={notifyTitle}
                        onChange={(e) => setNotifyTitle(e.target.value)}
                      />
                      <textarea
                        className="min-h-40 w-full rounded-md border border-black/20 p-2 text-sm"
                        value={notifyMarkdown}
                        onChange={(e) => setNotifyMarkdown(e.target.value)}
                        placeholder="消息通知内容（支持 Markdown）"
                      />
                      <div>
                        <p className="mb-2 text-xs font-medium text-slate-500">上传通知图片（可选）</p>
                        <label
                          className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-black/25 bg-slate-50 px-4 py-3 text-center transition hover:bg-slate-100"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            setNotifyImageFromList(e.dataTransfer.files);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setNotifyImageFromList(e.target.files)}
                          />
                          <p className="text-sm font-medium text-slate-700">拖拽图片到这里，或点击上传</p>
                          <p className="mt-1 text-xs text-slate-500">仅支持图片文件，单张上传</p>
                        </label>
                        {notifyImage ? (
                          <div className="mt-2 space-y-2 rounded-md border border-black/10 bg-white p-2">
                            <img
                              src={notifyImagePreviewUrl}
                              alt={notifyImage.name}
                              className="max-h-40 w-full rounded object-contain"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-slate-600">{notifyImage.name}</p>
                              <Button size="sm" variant="outline" onClick={() => setNotifyImage(null)}>移除</Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded border border-black/10 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-medium text-slate-500">内容预览</p>
                      <Markdown>{notifyMarkdown}</Markdown>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-black/10 px-4 py-3">
                    <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>取消</Button>
                    <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => { void publishNotification(); }}>确认新增</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'membership' ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-base font-semibold text-slate-900">会员管理</h2>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="用户ID" value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} />
                <Input placeholder="套餐（free/pro/vip）" value={memberPlan} onChange={(e) => setMemberPlan(e.target.value)} />
                <Input placeholder="状态（active/paused）" value={memberStatus} onChange={(e) => setMemberStatus(e.target.value)} />
                <Input placeholder="权益，逗号分隔" value={memberBenefits} onChange={(e) => setMemberBenefits(e.target.value)} />
              </div>
              <div className="pt-1">
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => { void upsertMembership(); }}>保存会员</Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">用户</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">套餐</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">权益</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberships.map((m) => (
                    <tr key={m.id} className="bg-white transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3">{m.userId}</td>
                      <td className="px-4 py-3">{m.plan}</td>
                      <td className="px-4 py-3">{m.status}</td>
                      <td className="px-4 py-3">{Array.isArray(m.benefits) ? m.benefits.join(' / ') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'ticket' ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">主题</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">内容</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="bg-white transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">{t.subject}</td>
                    <td className="px-4 py-3">{t.status}</td>
                    <td className="max-w-[420px] px-4 py-3 truncate">{t.content}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => { void updateTicketStatus(t.id, 'processing'); }}>处理中</Button>
                        <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => { void updateTicketStatus(t.id, 'done'); }}>已完成</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : null}
        </section>
      </div>
    </>
  );
}

