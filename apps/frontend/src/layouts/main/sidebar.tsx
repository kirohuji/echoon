import { Link } from 'react-router-dom';
import { usePathname } from 'src/routes/hooks';

const items = [
  { label: '用户管理', to: '/main/users' },
  { label: '会话管理', to: '/main/conversations' },
  { label: '资料库', to: '/main/document-library' },
  { label: '标签库', to: '/main/tags' },
];

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-black/10 bg-white p-4">
      <div className="mb-4 text-lg font-semibold">后台管理</div>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded px-3 py-2 text-sm transition ${
                active ? 'bg-black text-white' : 'hover:bg-black/5'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
