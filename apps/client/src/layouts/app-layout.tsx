import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/home', label: '首页' },
  { to: '/library', label: '教材' },
  { to: '/reading/1', label: '学习' },
  { to: '/notifications', label: '通知' },
  { to: '/me', label: '我的' },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 px-3 py-4 md:px-5">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
          <div className="mb-4 text-lg font-semibold">Echoon</div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to.replace('/:id', ''));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 space-y-4 pb-20 lg:pb-4">
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
                className={`rounded-md px-2 py-1 text-xs ${active ? 'text-indigo-700' : 'text-slate-500'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

