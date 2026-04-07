import { useMemo, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-provider';
import { Button } from '../components/ui/button';
import { useAppStore } from '../store/app-store';

const navItems = [
  { to: '/home', label: '首页' },
  { to: '/library', label: '教材' },
  { to: '/reading/1', label: '学习' },
  { to: '/notifications', label: '通知' },
  { to: '/me', label: '我的' },
];

export function AppLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const notifications = useAppStore((s) => s.notifications);
  const [settingOpen, setSettingOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const currentNavLabel =
    navItems.find((item) => location.pathname.startsWith(item.to.replace('/:id', '')))?.label ?? 'Echoon';
  const avatarText = useMemo(() => {
    const raw = String(user?.name ?? user?.username ?? user?.phone ?? '我').trim();
    return raw.slice(0, 1).toUpperCase();
  }, [user]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-slate-900">
      <div className="relative min-h-screen bg-slate-50">
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <div className="text-sm font-semibold text-slate-900">{currentNavLabel}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationOpen(true)}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="打开消息通知"
            >
              <span className="text-sm leading-none">🔔</span>
              {notifications.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setSettingOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              aria-label="打开设置"
            >
              {avatarText}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1320px] gap-4 px-3 py-4 md:px-5">
        <aside className="hidden w-64 shrink-0 rounded-lg border border-slate-200 bg-white p-4 lg:block">
          <div className="mb-4 text-base font-semibold">Echoon Client</div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to.replace('/:id', ''));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 space-y-4 pb-20 pt-14 lg:pb-4 lg:pt-0">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to.replace('/:id', ''));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded px-2 py-1 text-xs ${active ? 'text-slate-900' : 'text-slate-500'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      </div>

      <AnimatePresence>
        {notificationOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭通知抽屉"
              className="fixed inset-0 z-40 bg-black/45 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotificationOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 h-screen w-screen bg-white lg:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                <h2 className="text-sm font-semibold text-slate-900">消息通知</h2>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => setNotificationOpen(false)}
                  aria-label="关闭消息通知"
                >
                  ✕
                </button>
              </div>
              <div className="h-[calc(100vh-56px)] overflow-y-auto p-4">
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">暂无消息通知</div>
                  ) : (
                    notifications.map((n) => (
                      <article key={n.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{n.body}</p>
                        {n.createdAt ? <p className="mt-2 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p> : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
        {settingOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭设置抽屉"
              className="fixed inset-0 z-40 bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSettingOpen(false);
              }}
            />
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 520 }}
              dragElastic={{ top: 0, bottom: 0.22 }}
              onDragEnd={(_event, info: PanInfo) => {
                const shouldClose = info.offset.y > 140 || info.velocity.y > 900;
                if (shouldClose) {
                  setSettingOpen(false);
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[78vh] max-h-[78vh] w-full max-w-xl rounded-t-2xl bg-white shadow-2xl lg:hidden"
            >
              <div className="mx-auto w-full max-w-xl space-y-4 p-4">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {avatarText}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{String(user?.name ?? user?.username ?? '未命名用户')}</p>
                    <p className="truncate text-xs text-slate-500">{String(user?.phone ?? user?.email ?? '')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/me"
                    onClick={() => {
                      setSettingOpen(false);
                    }}
                    className="flex h-10 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    个人中心
                  </Link>
                  <Link
                    to="/me/tickets"
                    onClick={() => {
                      setSettingOpen(false);
                    }}
                    className="flex h-10 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    我的工单
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full border-rose-200 text-rose-700 hover:bg-rose-50/80"
                    onClick={() => {
                      void signOut();
                      setSettingOpen(false);
                    }}
                  >
                    退出登录
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

