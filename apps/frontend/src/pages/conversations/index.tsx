import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { conversationService } from 'src/composables/context-provider';
import { useRouter } from 'src/routes/hooks';

function formatMessagePreview(msg: any) {
  const content = msg?.content;
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') return content.text ?? content.message ?? JSON.stringify(content);
  return '';
}

export default function ConversationsPage() {
  const router = useRouter();
  const metadata = useMemo(() => ({ title: `会话管理 ${CONFIG.site.name}` }), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await conversationService.my();
        if (!mounted) return;
        setConversations(res?.data ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load conversations');
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
        <h1 className="mb-3 text-xl font-semibold">Conversations</h1>

        {loading ? <div className="text-sm text-gray-500">Loading...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="space-y-2">
            {conversations.map((c) => {
              const latest = c?.messages?.[0];
              const preview = formatMessagePreview(latest);
              return (
                <button
                  key={c.id}
                  type="button"
                  className="w-full rounded border border-black/10 bg-white px-3 py-2 text-left hover:bg-black/5"
                  onClick={() => router.push(`/main/conversations/${c.id}`)}
                >
                  <div className="font-medium">{c.title || c.id}</div>
                  <div className="mt-1 truncate text-xs text-gray-600">
                    {preview || latest ? preview || '...' : 'No messages'}
                  </div>
                </button>
              );
            })}

            {conversations.length === 0 ? (
              <div className="text-sm text-gray-500">No conversations</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

