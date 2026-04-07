import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { profileService, type MembershipDto, type NotificationDto, type TicketDto } from '../../features/profile/profile-service';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const [membership, setMembership] = useState<MembershipDto | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [tickets, setTickets] = useState<TicketDto[]>([]);

  useEffect(() => {
    void profileService.getMembership().then(setMembership).catch(() => null);
    void profileService.getNotifications().then(setNotifications).catch(() => setNotifications([]));
    void profileService.getTickets().then(setTickets).catch(() => setTickets([]));
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h1 className="text-xl font-semibold">个人中心</h1>
        <p className="mt-2 text-sm text-slate-600">个人信息、主题设置、会员、工单、通知统一管理。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card title="个人信息" desc={`当前用户：${user?.name ?? user?.username ?? '未命名用户'}`} />
          <Card title="主题设置" desc="支持亮色/暗色，后续增加系统跟随。" />
          <Card
            title="会员管理"
            desc={`套餐：${membership?.plan ?? 'Free'} · 状态：${membership?.status ?? 'normal'}`}
          />
          <Card title="规范文件" desc="放置学习规范、平台规则与常见问题文档。" />
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          退出登录
        </button>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">消息通知</h2>
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="rounded-md bg-slate-50 p-2">
                <p className="font-medium text-slate-700">{n.title}</p>
                <p>{n.body}</p>
              </li>
            ))}
            {notifications.length === 0 ? <li>暂无消息</li> : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">用户反馈（工单）</h2>
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {tickets.slice(0, 5).map((t) => (
              <li key={t.id} className="rounded-md bg-slate-50 p-2">
                <p className="font-medium text-slate-700">{t.subject}</p>
                <p>状态：{t.status}</p>
              </li>
            ))}
            {tickets.length === 0 ? <li>暂无工单</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
    </div>
  );
}

