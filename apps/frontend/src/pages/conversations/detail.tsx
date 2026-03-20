import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { conversationService } from 'src/composables/context-provider';
import { useParams, useRouter } from 'src/routes/hooks';

function formatMessageContent(msg: any) {
  const content = msg?.content;
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') return content.text ?? content.message ?? JSON.stringify(content);
  return '';
}

export default function ConversationDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const metadata = useMemo(() => ({ title: `会话详情 ${CONFIG.site.name}` }), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const limit = 20;

  const [messages, setMessages] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await conversationService.getMessages(id, { page, limit });
        if (!mounted) return;
        const payload = res?.data ?? {};
        setMessages(payload?.data ?? []);
        setTotalPages(payload?.totalPages ?? 1);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [id, page]);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-black/10 bg-white px-3 py-1 text-sm hover:bg-black/5"
            onClick={() => router.back()}
          >
            Back
          </button>
          <h1 className="text-xl font-semibold">Conversation: {id}</h1>
        </div>

        {loading ? <div className="text-sm text-gray-500">Loading...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <>
            <div className="space-y-3 rounded border border-black/10 bg-white p-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded bg-black/[0.03] p-2">
                  <div className="text-xs text-gray-500">
                    {m.senderId} • {m.languageCode ?? 'n/a'}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{formatMessageContent(m)}</div>
                </div>
              ))}
              {messages.length === 0 ? (
                <div className="text-sm text-gray-500">No messages</div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="rounded border border-black/10 bg-white px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>

              <div className="text-sm text-gray-600">
                Page {page} / {totalPages}
              </div>

              <button
                type="button"
                className="rounded border border-black/10 bg-white px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

