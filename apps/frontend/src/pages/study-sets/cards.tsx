import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudyCardDto, StudyCardType, StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

type TabMode = 'single' | 'batch';

export default function StudySetCardsPage() {
  const { id } = useParams<{ id: string }>();
  const metadata = useMemo(() => ({ title: `卡片管理 ${CONFIG.site.name}` }), []);
  const [detail, setDetail] = useState<StudySetDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabMode>('single');

  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [cardType, setCardType] = useState<StudyCardType>('translation');
  const [batchText, setBatchText] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studySetService.getDetail(id);
      setDetail((res as { data?: StudySetDetailDto })?.data ?? null);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: { message?: string } } } };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const addSingle = async () => {
    if (!id || !term.trim() || !definition.trim()) {
      setError('请填写完整的正面和背面');
      return;
    }
    await studySetService.addCards(id, [{ term: term.trim(), definition: definition.trim(), cardType }]);
    setTerm('');
    setDefinition('');
    setCardType('translation');
    await load();
  };

  const parseBatch = () => {
    const rows = batchText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split('\t').map((s) => s.trim()));

    return rows
      .filter((r) => r.length >= 2 && r[0] && r[1])
      .map((r) => ({
        term: r[0],
        definition: r[1],
        cardType: (r[2] === 'qa' ? 'qa' : 'translation') as StudyCardType,
      }));
  };

  const addBatch = async () => {
    if (!id) return;
    const items = parseBatch();
    if (items.length === 0) {
      setError('批量格式错误，请使用：term[TAB]definition[TAB]type(可选)');
      return;
    }
    await studySetService.addCards(id, items);
    setBatchText('');
    await load();
  };

  const saveCard = async (card: StudyCardDto, next: { term: string; definition: string; cardType: StudyCardType }) => {
    await studySetService.updateCard(card.id, {
      term: next.term,
      definition: next.definition,
      cardType: next.cardType,
    });
    await load();
  };

  const removeCard = async (cardId: string) => {
    if (!window.confirm('确定删除该卡片吗？')) return;
    await studySetService.deleteCard(cardId);
    await load();
  };

  if (!id) return <div className="p-4 text-sm text-red-600">无效链接</div>;

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">卡片管理</h1>
          <Link to={paths.main.studySets.detail(id)} className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium hover:bg-black/5">返回概览</Link>
        </div>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && detail ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex gap-2">
                <button type="button" onClick={() => setTab('single')} className={`rounded-md px-3 py-1.5 text-sm ${tab === 'single' ? 'bg-black text-white' : 'bg-slate-100 text-slate-700'}`}>单条添加</button>
                <button type="button" onClick={() => setTab('batch')} className={`rounded-md px-3 py-1.5 text-sm ${tab === 'batch' ? 'bg-black text-white' : 'bg-slate-100 text-slate-700'}`}>批量导入</button>
              </div>

              {tab === 'single' ? (
                <div className="grid gap-2 md:grid-cols-4">
                  <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="正面（term）" />
                  <Input value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="背面（definition）" />
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={cardType} onChange={(e) => setCardType(e.target.value as StudyCardType)}>
                    <option value="translation">翻译题</option>
                    <option value="qa">问答题</option>
                  </select>
                  <Button onClick={addSingle}>添加</Button>
                </div>
              ) : (
                <div>
                  <textarea className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder={'每行一条：term\tdefinition\ttype(可选)\nhello\t你好\ttranslation\nWhat is AI?\tArtificial Intelligence\tqa'} value={batchText} onChange={(e) => setBatchText(e.target.value)} />
                  <Button className="mt-2" onClick={addBatch}>导入批量</Button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-medium">正面</th>
                    <th className="px-3 py-2 font-medium">背面</th>
                    <th className="px-3 py-2 font-medium">题型</th>
                    <th className="px-3 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.cards.map((card) => (
                    <CardRow key={card.id} card={card} onSave={saveCard} onDelete={() => removeCard(card.id)} />
                  ))}
                </tbody>
              </table>
              {detail.cards.length === 0 ? <div className="p-3 text-sm text-gray-500">暂无卡片</div> : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function CardRow({
  card,
  onSave,
  onDelete,
}: {
  card: StudyCardDto;
  onSave: (card: StudyCardDto, next: { term: string; definition: string; cardType: StudyCardType }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);
  const [cardType, setCardType] = useState<StudyCardType>(card.cardType);

  useEffect(() => {
    setTerm(card.term);
    setDefinition(card.definition);
    setCardType(card.cardType);
  }, [card]);

  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2"><Input value={term} onChange={(e) => setTerm(e.target.value)} /></td>
      <td className="px-3 py-2"><Input value={definition} onChange={(e) => setDefinition(e.target.value)} /></td>
      <td className="px-3 py-2">
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={cardType} onChange={(e) => setCardType(e.target.value as StudyCardType)}>
          <option value="translation">翻译题</option>
          <option value="qa">问答题</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onSave(card, { term: term.trim(), definition: definition.trim(), cardType })}>保存</Button>
          <Button size="sm" variant="outline" onClick={() => { void onDelete(); }}>删除</Button>
        </div>
      </td>
    </tr>
  );
}
