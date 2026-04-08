import { Link } from 'react-router-dom';
import { AppButton } from '../../components/app/app-button';
import { SectionHeading } from '../../components/app/section-heading';
import { SurfaceCard } from '../../components/app/surface-card';
import { ThemeModeSegment } from '../../components/theme-mode-segment';
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
        <SectionHeading
          title="个人中心"
          desc="个人信息与会员概览；手机上在「我的」页通过右上角齿轮进入设置。"
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card title="个人信息" desc={`当前用户：${user?.name ?? user?.username ?? '未命名用户'}`} />
          <Card
            title="会员管理"
            desc={`套餐：${membership?.plan ?? 'Free'} · 状态：${membership?.status ?? 'normal'}`}
          />
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 lg:hidden">
          进入方式：顶栏头像菜单 →「个人中心」。在本页时，铃铛旁为设置：主题、规范文件、用户反馈、退出登录。
        </p>
        <div className="mt-4 hidden space-y-4 lg:block">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">主题设置</p>
            <ThemeModeSegment className="mt-2 max-w-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/me/guidelines"
              className="inline-flex h-10 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              规范文件
            </Link>
            <Link
              to="/me/tickets"
              className="inline-flex h-10 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              用户反馈
            </Link>
          </div>
        </div>
        <AppButton onClick={() => void signOut()} className="mt-4 hidden lg:inline-flex">
          退出登录
        </AppButton>
      </SurfaceCard>

      <section className="space-y-4">
        <SurfaceCard className="p-4">
          <SectionHeading title="消息通知" />
          <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {notifications.slice(0, 5).map((n) => (
              <li
                key={n.id}
                className="rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <p className="font-medium text-slate-700 dark:text-slate-200">{n.title}</p>
                <p>{n.body}</p>
              </li>
            ))}
            {notifications.length === 0 ? <li>暂无消息</li> : null}
          </ul>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <SectionHeading title="用户反馈（工单）" />
          <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {tickets.slice(0, 5).map((t) => (
              <li
                key={t.id}
                className="rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <p className="font-medium text-slate-700 dark:text-slate-200">{t.subject}</p>
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
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-sm font-semibold dark:text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{desc}</p>
    </div>
  );
}

