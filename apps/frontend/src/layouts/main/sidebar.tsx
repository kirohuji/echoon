import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { signOut } from 'src/auth/context/jwt/action';
import { useAuthContext } from 'src/auth/hooks';
import { Iconify } from 'src/components/iconify';
import { cn } from 'src/lib/utils';
import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';

const STORAGE_KEY = 'echoon-main-sidebar-collapsed';

const items = [
  {
    label: '用户管理',
    to: '/main/users',
    icon: 'solar:users-group-two-rounded-bold-duotone',
  },
  {
    label: '资料库',
    to: '/main/document-library',
    icon: 'solar:documents-bold-duotone',
  },
  {
    label: '标签库',
    to: '/main/tags',
    icon: 'solar:tag-bold-duotone',
  },
];

function sidebarUserLines(user: Record<string, unknown> | null) {
  if (!user) return { line1: '', line2: '' };
  const email = String(user.email ?? '').trim();
  const phone = String((user.phone as string) ?? (user.phoneNumber as string) ?? '').trim();
  const name = String((user.name as string) ?? (user.username as string) ?? '').trim();
  const line1 = name || email || phone || '当前用户';
  let line2 = '';
  if (email && line1 !== email) line2 = email;
  else if (phone && line1 !== phone) line2 = phone;
  else line2 = String(user.role ?? '').trim();
  return { line1, line2 };
}

export function MainSidebar() {
  const pathname = usePathname();
  const navigate = useNavigate();
  const { user, loading, checkUserSession } = useAuthContext();
  const [signingOut, setSigningOut] = useState(false);
  const userRecord = user as Record<string, unknown> | null;
  const { line1, line2 } = useMemo(
    () => sidebarUserLines(user as Record<string, unknown> | null),
    [user],
  );
  const avatarUrl =
    userRecord && typeof userRecord.image === 'string' ? userRecord.image.trim() : '';
  const avatarLetter = (line1 || '?').slice(0, 1).toUpperCase();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggle = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      await checkUserSession?.();
      navigate(paths.auth.jwt.signIn, { replace: true });
    } finally {
      setSigningOut(false);
    }
  }, [checkUserSession, navigate]);

  return (
    <aside
      className={cn(
        'flex min-h-screen shrink-0 flex-col border-r border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white py-3 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[4.5rem] px-2' : 'w-52 px-3',
      )}
    >
      <div
        className={cn(
          'mb-2 flex items-center gap-2 border-b border-slate-100 pb-2',
          collapsed && 'flex-col border-0 pb-1',
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-slate-800">
            Echoon后台管理
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
          title={collapsed ? '展开菜单' : '收起菜单'}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm',
            'ring-1 ring-transparent hover:ring-slate-200/80',
            collapsed && 'w-full',
          )}
        >
          <Iconify
            icon={
              collapsed
                ? 'solar:round-double-alt-arrow-right-bold-duotone'
                : 'solar:round-double-alt-arrow-left-bold-duotone'
            }
            width={22}
          />
        </button>
      </div>

      <nav className={cn('flex flex-1 flex-col gap-0.5', collapsed && 'items-center')}>
        {items.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg text-sm font-medium transition',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-2.5 py-1.5',
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200/80',
              )}
            >
              <Iconify
                icon={item.icon}
                width={22}
                className={cn(active ? 'text-white' : 'text-indigo-600')}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-3">
        {loading ? (
          <div
            className={cn(
              'animate-pulse bg-slate-200/70',
              collapsed ? 'mx-auto h-12 w-12 rounded-full' : 'h-[4.25rem] rounded-lg',
            )}
          />
        ) : userRecord ? (
          <div className={cn('flex flex-col', collapsed ? 'items-center gap-2.5' : 'gap-2.5 px-0.5')}>
            {collapsed ? (
              <>
                <div
                  className="flex justify-center"
                  title={[line1, line2].filter(Boolean).join(' · ')}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 ring-2 ring-white shadow-sm">
                      {avatarLetter}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut().catch(() => null);
                  }}
                  disabled={signingOut}
                  title={signingOut ? '正在退出…' : '退出登录'}
                  aria-label="退出登录"
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium transition',
                    'text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-sm',
                    'ring-1 ring-transparent hover:ring-slate-200/80',
                    'disabled:pointer-events-none disabled:opacity-50',
                  )}
                >
                  <Iconify icon="solar:logout-3-bold-duotone" width={20} className="shrink-0" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <div className="shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 ring-2 ring-white shadow-sm">
                        {avatarLetter}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 pb-px">
                    <div className="truncate text-sm font-medium leading-snug text-slate-900">
                      {line1}
                    </div>
                    <div className="min-w-0 truncate text-xs leading-snug text-slate-500">
                      {line2 || '\u00A0'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut().catch(() => null);
                  }}
                  disabled={signingOut}
                  title={signingOut ? '正在退出…' : '退出登录'}
                  aria-label="退出登录"
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                    'text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-sm',
                    'ring-1 ring-transparent hover:ring-slate-200/80',
                    'disabled:pointer-events-none disabled:opacity-50',
                  )}
                >
                  <Iconify icon="solar:logout-3-bold-duotone" width={20} className="shrink-0" />
                  <span className="truncate">{signingOut ? '退出中…' : '退出登录'}</span>
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
