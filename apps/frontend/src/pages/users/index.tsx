import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { userService } from 'src/composables/context-provider';

export default function UsersPage() {
  const metadata = useMemo(() => ({ title: `用户管理 ${CONFIG.site.name}` }), []);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await userService.getAll({});
        if (!mounted) return;
        setUsers(res?.data ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load users');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="p-4">
        <h1 className="mb-3 text-xl font-semibold">Users</h1>

        {loading ? <div className="text-sm text-gray-500">Loading...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded border border-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Username</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-black/10">
                    <td className="px-3 py-2">{u.id}</td>
                    <td className="px-3 py-2">{u.phone}</td>
                    <td className="px-3 py-2">{u.username ?? '-'}</td>
                    <td className="px-3 py-2">{u.status ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}

