import { useEffect, useMemo, useState } from 'react';
import { AppButton } from '../../components/app/app-button';
import { SectionHeading } from '../../components/app/section-heading';
import { SurfaceCard } from '../../components/app/surface-card';
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
          <SurfaceCard key={b.id} className="p-5">
            <p className="text-base font-semibold text-slate-900">{b.title}</p>
            <p className="mt-1 text-sm text-slate-600">{b.sub}</p>
          </SurfaceCard>
        ))}
      </section>

      <SurfaceCard className="p-4">
        <SectionHeading title="教材分类" desc="按主题筛选你关心的内容" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag('all')}
            className={`rounded-md border px-3 py-1 text-sm ${
              activeTag === 'all' ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            全部
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTag(t.id)}
              className={`rounded-md border px-3 py-1 text-sm ${
                activeTag === t.id ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <SectionHeading title="推荐教材" desc="干净的信息密度，PC 优先排版" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleDocs.map((d) => (
            <article key={d.id} className="rounded-md border border-slate-200 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{d.title}</h3>
              <p className="mt-1 text-xs text-slate-500">类型：{d.fileType ?? 'doc'}</p>
              <AppButton
                onClick={() => setAdded((s) => ({ ...s, [d.id]: !s[d.id] }))}
                className="mt-3 text-xs"
                tone={added[d.id] ? 'soft' : 'primary'}
              >
                {added[d.id] ? '已加入我的教材' : '加入我的教材'}
              </AppButton>
            </article>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

