import { AppButton } from '../../components/app/app-button';
import { SectionHeading } from '../../components/app/section-heading';
import { SurfaceCard } from '../../components/app/surface-card';
import { useAuth } from '../../auth/auth-provider';
import { useAppStore } from '../../store/app-store';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const membership = useAppStore((s) => s.membership);
  const notifications = useAppStore((s) => s.notifications);
  const tickets = useAppStore((s) => s.tickets);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SurfaceCard className="p-5 lg:col-span-2">
        <SectionHeading title="个人中心" desc="个人信息、主题设置、会员、工单、通知统一管理。" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card title="个人信息" desc={`当前用户：${user?.name ?? user?.username ?? '未命名用户'}`} />
          <Card title="主题设置" desc="支持亮色/暗色，后续增加系统跟随。" />
          <Card
            title="会员管理"
            desc={`套餐：${membership?.plan ?? 'Free'} · 状态：${membership?.status ?? 'normal'}`}
          />
          <Card title="规范文件" desc="放置学习规范、平台规则与常见问题文档。" />
        </div>
        <AppButton onClick={() => void signOut()} className="mt-4">
          退出登录
        </AppButton>
      </SurfaceCard>

      <section className="space-y-4">
        <SurfaceCard className="p-4">
          <SectionHeading title="消息通知" />
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                <p className="font-medium text-slate-700">{n.title}</p>
                <p>{n.body}</p>
              </li>
            ))}
            {notifications.length === 0 ? <li>暂无消息</li> : null}
          </ul>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <SectionHeading title="用户反馈（工单）" />
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {tickets.slice(0, 5).map((t) => (
              <li key={t.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                <p className="font-medium text-slate-700">{t.subject}</p>
                <p>状态：{t.status}</p>
              </li>
            ))}
            {tickets.length === 0 ? <li>暂无工单</li> : null}
          </ul>
        </SurfaceCard>
      </section>
    </div>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
    </div>
  );
}

