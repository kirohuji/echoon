import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { useAuthContext } from 'src/auth/hooks';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { adminUserApi } from 'src/composables/context-provider';
import { cn } from 'src/lib/utils';

type AdminUserRow = {
  id: string;
  email: string;
  phoneNumber: string;
  username?: string | null;
  name?: string | null;
  status: number;
  emails: string[];
  lastOnline?: number | null;
  createdAt: number;
  updatedAt: number;
  roleAssignments?: { role: { value: string; label: string } }[];
};

function formatTs(v: number | undefined | null) {
  if (v == null) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN');
}

const selectClass =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

/* eslint-disable jsx-a11y/label-has-associated-control -- 标签包裹输入控件，部分规则版本不识别 */
export default function UsersPage() {
  const metadata = useMemo(() => ({ title: `用户管理 ${CONFIG.site.name}` }), []);
  const { user: currentUser } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminUserApi.list();
      setUsers(res?.data ?? []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '加载用户列表失败';
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState(1);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setModal('create');
    setEditing(null);
    setFormPhone('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setFormStatus(1);
    setError(null);
  };

  const openEdit = (u: AdminUserRow) => {
    setModal('edit');
    setEditing(u);
    setFormPhone(u.phoneNumber);
    setFormEmail(u.email);
    setFormUsername(u.username ?? '');
    setFormPassword('');
    setFormStatus(u.status);
    setError(null);
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      await adminUserApi.create({
        phoneNumber: formPhone,
        email: formEmail || undefined,
        username: formUsername || undefined,
        password: formPassword,
        status: formStatus,
      });
      setModal(null);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '创建失败';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        phoneNumber: formPhone,
        email: formEmail,
        username: formUsername || null,
        status: formStatus,
      };
      if (formPassword.length >= 6) {
        body.password = formPassword;
      }
      await adminUserApi.update(editing.id, body);
      setModal(null);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '更新失败';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: AdminUserRow) => {
    const next = u.status === 1 ? 0 : 1;
    try {
      await adminUserApi.update(u.id, { status: next });
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '更新状态失败';
      setError(msg);
    }
  };

  const removeUser = async (u: AdminUserRow) => {
    if (!window.confirm(`确定移除（禁用）用户 ${u.phoneNumber}？`)) return;
    try {
      await adminUserApi.remove(u.id);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '删除失败';
      setError(msg);
    }
  };

  const displayName =
    (currentUser as { name?: string })?.name ||
    (currentUser as { username?: string })?.username ||
    '—';
  const displayPhone =
    (currentUser as { phone?: string })?.phone ||
    (currentUser as { phoneNumber?: string })?.phoneNumber ||
    '—';

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        {/* 页头 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">用户管理</h1>
            <p className="mt-1 text-sm text-slate-500">管理系统账号、启用状态与登录相关信息</p>
          </div>
          <Button
            type="button"
            className="bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700"
            onClick={() => openCreate()}
          >
            新建用户
          </Button>
        </div>

        {/* 当前用户卡片 */}
        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">当前登录</div>
          {currentUser ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-base font-medium text-slate-900">{displayName}</span>
              <span className="text-slate-400">·</span>
              <span className="text-sm text-slate-600">
                手机 <span className="font-mono text-slate-800">{displayPhone}</span>
              </span>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-500">未登录</div>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            第三方登录需在后端配置 <span className="font-mono text-slate-600">GOOGLE_*</span> /{' '}
            <span className="font-mono text-slate-600">GITHUB_*</span>、<span className="font-mono text-slate-600">BETTER_AUTH_URL</span> 与{' '}
            <span className="font-mono text-slate-600">FRONTEND_ORIGINS</span>，通过 better-auth 的{' '}
            <span className="font-mono text-slate-600">/api/auth</span> 完成 OAuth。
          </p>
        </div>

        {error ? (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-sm"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-8 text-slate-500 shadow-sm">
            <div
              className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
              aria-hidden
            />
            <span className="text-sm">加载用户列表…</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      用户 ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      手机号
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      用户名
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      邮箱
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      角色
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      状态
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      最后在线
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      创建时间
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      更新时间
                    </th>
                    <th className="sticky right-0 whitespace-nowrap border-l border-slate-100 bg-slate-50/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                        暂无用户数据
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className="bg-white transition-colors hover:bg-slate-50/60"
                      >
                        <td className="max-w-[8rem] px-4 py-3 font-mono text-xs text-slate-600 break-all">
                          {u.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-800">{u.phoneNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{u.username ?? '—'}</td>
                        <td className="max-w-[12rem] px-4 py-3 break-all text-xs text-slate-600">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[10rem] flex-wrap gap-1">
                            {(u.roleAssignments ?? []).length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              u.roleAssignments!.map((ra) => (
                                <span
                                  key={`${u.id}-${ra.role.value}`}
                                  className="inline-flex rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-600/15"
                                >
                                  {ra.role.label || ra.role.value}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                              u.status === 1
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                                : 'bg-rose-50 text-rose-800 ring-rose-600/20',
                            )}
                          >
                            {u.status === 1 ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatTs(u.lastOnline)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatTs(u.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatTs(u.updatedAt)}
                        </td>
                        <td className="sticky right-0 border-l border-slate-100 bg-white/95 px-3 py-2 backdrop-blur-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-slate-200 text-slate-700 hover:bg-slate-50"
                              onClick={() => openEdit(u)}
                            >
                              编辑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={cn(
                                'border-slate-200',
                                u.status === 1
                                  ? 'text-amber-700 hover:bg-amber-50/80'
                                  : 'text-emerald-700 hover:bg-emerald-50/80',
                              )}
                              onClick={() => {
                                toggleStatus(u).catch(() => null);
                              }}
                            >
                              {u.status === 1 ? '禁用' : '启用'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50/80"
                              onClick={() => {
                                removeUser(u).catch(() => null);
                              }}
                            >
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="关闭对话框"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              disabled={saving}
              onClick={() => setModal(null)}
            />
            <div
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-dialog-title"
            >
              <h2 id="user-dialog-title" className="text-lg font-semibold text-slate-900">
                {modal === 'create' ? '新建用户' : '编辑用户'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modal === 'create' ? '填写手机号与初始密码，邮箱可留空由系统自动生成。' : '修改资料或重置密码。'}
              </p>
              <div className="mt-5 flex flex-col gap-4 text-sm">
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-slate-700">手机号</span>
                  <Input
                    value={formPhone}
                    onChange={(ev) => setFormPhone(ev.target.value)}
                    disabled={modal === 'edit'}
                    className="border-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-slate-700">邮箱</span>
                  <Input
                    value={formEmail}
                    onChange={(ev) => setFormEmail(ev.target.value)}
                    className="border-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-slate-700">用户名</span>
                  <Input
                    value={formUsername}
                    onChange={(ev) => setFormUsername(ev.target.value)}
                    className="border-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-slate-700">
                    {modal === 'create' ? '初始密码（至少 6 位）' : '新密码（可选，至少 6 位）'}
                  </span>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(ev) => setFormPassword(ev.target.value)}
                    className="border-slate-200"
                    autoComplete="new-password"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-slate-700">状态</span>
                  <select
                    className={selectClass}
                    value={formStatus}
                    onChange={(ev) => setFormStatus(Number(ev.target.value))}
                  >
                    <option value={1}>启用</option>
                    <option value={0}>禁用</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200"
                  onClick={() => setModal(null)}
                  disabled={saving}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={saving || !formPhone || (modal === 'create' && formPassword.length < 6)}
                  onClick={() => {
                    const p = modal === 'create' ? submitCreate() : submitEdit();
                    p.catch(() => null);
                  }}
                >
                  {saving ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
/* eslint-enable jsx-a11y/label-has-associated-control */
