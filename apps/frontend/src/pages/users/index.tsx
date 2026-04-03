import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { useAuthContext } from 'src/auth/hooks';
import { CONFIG } from 'src/config-global';
import { adminUserApi } from 'src/composables/context-provider';

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
  };

  const openEdit = (u: AdminUserRow) => {
    setModal('edit');
    setEditing(u);
    setFormPhone(u.phoneNumber);
    setFormEmail(u.email);
    setFormUsername(u.username ?? '');
    setFormPassword('');
    setFormStatus(u.status);
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

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="p-4">
        <h1 className="mb-3 text-xl font-semibold">用户管理</h1>

        <div className="mb-4 rounded border border-black/10 bg-black/[0.02] p-3 text-sm">
          <div className="font-medium text-gray-800">当前登录</div>
          {currentUser ? (
            <div className="mt-1 text-gray-700">
              {(currentUser as { name?: string }).name ||
                (currentUser as { username?: string }).username ||
                '—'}{' '}
              · 手机{' '}
              {(currentUser as { phone?: string }).phone ||
                (currentUser as { phoneNumber?: string }).phoneNumber ||
                '—'}
            </div>
          ) : (
            <div className="mt-1 text-gray-500">未登录</div>
          )}
          <div className="mt-2 text-xs text-gray-500">
            第三方登录：在后端配置 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、GITHUB_CLIENT_ID、GITHUB_CLIENT_SECRET
            与 BETTER_AUTH_URL / FRONTEND_ORIGINS 后，可通过 better-auth 的 `/api/auth` 路由完成 OAuth；微信通常需使用
            generic OAuth 或单独 SDK 接入。
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-black px-3 py-1.5 text-sm text-white"
            onClick={() => openCreate()}
          >
            新建用户
          </button>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="mb-2 text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded border border-black/10">
            <table className="min-w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[14ch]" />
                <col className="w-[22ch]" />
                <col className="w-[14ch]" />
                <col className="w-[20ch]" />
                <col className="w-[8ch]" />
                <col className="w-[16ch]" />
                <col className="w-[18ch]" />
                <col className="w-[14ch]" />
                <col className="w-[22ch]" />
              </colgroup>
              <thead className="bg-black/5">
                <tr>
                  <th className="px-3 py-2 font-medium">用户 ID</th>
                  <th className="px-3 py-2 font-medium">手机号</th>
                  <th className="px-3 py-2 font-medium">用户名</th>
                  <th className="px-3 py-2 font-medium">邮箱</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">最后在线</th>
                  <th className="px-3 py-2 font-medium">创建时间</th>
                  <th className="px-3 py-2 font-medium">更新时间</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-black/10">
                    <td className="px-3 py-2 font-mono text-xs break-all">{u.id}</td>
                    <td className="px-3 py-2 align-top">{u.phoneNumber}</td>
                    <td className="px-3 py-2 align-top">{u.username ?? '—'}</td>
                    <td className="px-3 py-2 align-top break-all text-xs">{u.email}</td>
                    <td className="px-3 py-2 align-top">
                      {u.status === 1 ? '启用' : '禁用'}
                    </td>
                    <td className="px-3 py-2 align-top">{formatTs(u.lastOnline)}</td>
                    <td className="px-3 py-2 align-top text-xs">{formatTs(u.createdAt)}</td>
                    <td className="px-3 py-2 align-top text-xs">{formatTs(u.updatedAt)}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="text-left text-blue-600 hover:underline"
                          onClick={() => openEdit(u)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="text-left text-orange-600 hover:underline"
                          onClick={() => {
                            toggleStatus(u).catch(() => null);
                          }}
                        >
                          {u.status === 1 ? '禁用' : '启用'}
                        </button>
                        <button
                          type="button"
                          className="text-left text-red-600 hover:underline"
                          onClick={() => {
                            removeUser(u).catch(() => null);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {modal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold">
                {modal === 'create' ? '新建用户' : '编辑用户'}
              </h2>
              <div className="flex flex-col gap-3 text-sm">
                <label className="flex flex-col gap-1 text-gray-700">
                  手机号
                  <input
                    className="rounded border border-black/20 px-2 py-1 text-gray-900"
                    value={formPhone}
                    onChange={(ev) => setFormPhone(ev.target.value)}
                    disabled={modal === 'edit'}
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-700">
                  邮箱
                  <input
                    className="rounded border border-black/20 px-2 py-1 text-gray-900"
                    value={formEmail}
                    onChange={(ev) => setFormEmail(ev.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-700">
                  用户名
                  <input
                    className="rounded border border-black/20 px-2 py-1 text-gray-900"
                    value={formUsername}
                    onChange={(ev) => setFormUsername(ev.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-700">
                  {modal === 'create' ? '初始密码（至少 6 位）' : '新密码（可选，至少 6 位）'}
                  <input
                    type="password"
                    className="rounded border border-black/20 px-2 py-1 text-gray-900"
                    value={formPassword}
                    onChange={(ev) => setFormPassword(ev.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-700">
                  状态
                  <select
                    className="rounded border border-black/20 px-2 py-1 text-gray-900"
                    value={formStatus}
                    onChange={(ev) => setFormStatus(Number(ev.target.value))}
                  >
                    <option value={1}>启用</option>
                    <option value={0}>禁用</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded border border-black/20 px-3 py-1.5"
                  onClick={() => setModal(null)}
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50"
                  disabled={saving || !formPhone || (modal === 'create' && formPassword.length < 6)}
                  onClick={() => {
                    const p = modal === 'create' ? submitCreate() : submitEdit();
                    p.catch(() => null);
                  }}
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
/* eslint-enable jsx-a11y/label-has-associated-control */
