import { Link } from 'react-router-dom';
import { usePathname } from 'src/routes/hooks';

const items = [
  { label: '用户管理', to: '/main/users' },
  // { label: '会话管理', to: '/main/conversations' },
  { label: '资料库', to: '/main/document-library' },
  { label: '标签库', to: '/main/tags' },
];

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white px-3 py-3">
      <div className="mb-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        后台管理
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200/80'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
