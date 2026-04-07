import { useEffect, useMemo, useState } from 'react';
import { homeService, type HomeDoc, type HomeTag } from '../../features/home/home-service';

const banners = [
  { id: 'b1', title: '英语精听训练营', sub: '跟读 + 讲解 + 测评一体化' },
  { id: 'b2', title: '雅思真题分类', sub: '按话题快速筛选你的教材' },
  { id: 'b3', title: '商务英语表达', sub: '高频场景即学即用' },
];

export function HomePage() {
  const [tags, setTags] = useState<HomeTag[]>([]);
  const [docs, setDocs] = useState<HomeDoc[]>([]);
  const [activeTag, setActiveTag] = useState<string>('all');
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void homeService.getTags().then(setTags).catch(() => setTags([]));
    void homeService
      .getDocs(1, 8)
      .then((res) => setDocs(res.records ?? []))
      .catch(() => setDocs([]));
  }, []);

  const visibleDocs = useMemo(() => docs, [docs]);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3">
        {banners.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{b.title}</p>
            <p className="mt-1 text-sm text-slate-600">{b.sub}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-800">教材分类</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag('all')}
            className={`rounded-full px-3 py-1 text-sm ${
              activeTag === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            全部
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTag(t.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                activeTag === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">推荐教材</p>
          <span className="text-xs text-slate-500">PC 优先布局</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleDocs.map((d) => (
            <article key={d.id} className="rounded-xl border border-slate-200 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{d.title}</h3>
              <p className="mt-1 text-xs text-slate-500">类型：{d.fileType ?? 'doc'}</p>
              <button
                type="button"
                onClick={() => setAdded((s) => ({ ...s, [d.id]: !s[d.id] }))}
                className={`mt-3 rounded-md px-3 py-1.5 text-xs ${
                  added[d.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'
                }`}
              >
                {added[d.id] ? '已加入我的教材' : '加入我的教材'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

