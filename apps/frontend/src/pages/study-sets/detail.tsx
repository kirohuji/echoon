import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { cn } from 'src/lib/utils';
import { CONFIG } from 'src/config-global';
import { studySetService } from 'src/composables/context-provider';
import type { StudyCardDto, StudySetDetailDto } from 'src/modules/study-set';
import { paths } from 'src/routes/paths';

export default function StudySetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<StudySetDetailDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchText, setBatchText] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [singleTerm, setSingleTerm] = useState('');
  const [singleDef, setSingleDef] = useState('');
  const metadata = useMemo(() => ({ title: `学习集详情 ${CONFIG.site.name}` }), []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studySetService.getDetail(id);
      const data = (res as { data?: StudySetDetailDto })?.data;
      if (!data) {
        setError('学习集不存在');
        setDetail(null);
        return;
      }
      setDetail(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '加载失败');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveMeta = async () => {
    if (!id) return;
    try {
      setError(null);
      await studySetService.updateSet(id, {
        title: title.trim(),
        description: description.trim(),
      });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '保存失败');
    }
  };

  const parseBatch = (): { term: string; definition: string }[] => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const items: { term: string; definition: string }[] = [];
    for (const line of lines) {
      const tabIdx = line.indexOf('\t');
      if (tabIdx === -1) continue;
      const term = line.slice(0, tabIdx).trim();
      const definition = line.slice(tabIdx + 1).trim();
      if (term && definition) {
        items.push({ term, definition });
      }
    }
    return items;
  };

  const addBatch = async () => {
    if (!id) return;
    const items = parseBatch();
    if (items.length === 0) {
      setError('批量添加：每行格式为「正面[TAB]背面」');
      return;
    }
    try {
      setSavingBatch(true);
      setError(null);
      await studySetService.addCards(id, items);
      setBatchText('');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '添加失败');
    } finally {
      setSavingBatch(false);
    }
  };

  const addSingle = async () => {
    if (!id) return;
    if (!singleTerm.trim() || !singleDef.trim()) {
      setError('请填写单张卡片的正面与背面');
      return;
    }
    try {
      setError(null);
      await studySetService.addCards(id, [
        { term: singleTerm.trim(), definition: singleDef.trim() },
      ]);
      setSingleTerm('');
      setSingleDef('');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '添加失败');
    }
  };

  const updateCardRow = async (card: StudyCardDto, term: string, definition: string) => {
    try {
      setError(null);
      await studySetService.updateCard(card.id, {
        term: term.trim(),
        definition: definition.trim(),
      });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err?.response?.data?.error?.message ?? err?.message ?? '更新失败');
    }
  };

  const removeCard = async (cardId: string) => {
    if (!window.confirm('删除该卡片？')) return;
    try {
      await studySetService.deleteCard(cardId);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  if (!id) {
    return <div className="p-4 text-sm text-red-600">无效链接</div>;
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            to={paths.main.studySets.root}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-md border border-black/20 bg-white px-3 text-sm font-medium hover:bg-black/5',
            )}
          >
            返回列表
          </Link>
          <Link
            to={paths.main.studySets.study(id)}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/90',
            )}
          >
            开始练习
          </Link>
        </div>

        <h1 className="mb-4 text-xl font-semibold">编辑学习集</h1>

        {loading ? <div className="text-sm text-gray-500">加载中…</div> : null}
        {error ? <div className="mb-2 text-sm text-red-600">{error}</div> : null}

        {!loading && detail ? (
          <>
            <div className="mb-6 flex max-w-3xl flex-col gap-2">
              <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input
                placeholder="描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="button" className="w-fit" onClick={saveMeta}>
                保存标题与描述
              </Button>
            </div>

            <h2 className="mb-2 text-base font-semibold">添加卡片</h2>
            <div className="mb-4 flex max-w-3xl flex-wrap gap-2">
              <Input
                className="min-w-[140px] flex-1"
                placeholder="正面"
                value={singleTerm}
                onChange={(e) => setSingleTerm(e.target.value)}
              />
              <Input
                className="min-w-[140px] flex-1"
                placeholder="背面"
                value={singleDef}
                onChange={(e) => setSingleDef(e.target.value)}
              />
              <Button type="button" onClick={addSingle}>
                添加一张
              </Button>
            </div>

            <div className="mb-6 max-w-3xl">
              <label className="mb-1 block text-sm text-gray-600">
                批量添加（每行：正面[TAB]背面）
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'例如：\nhello\t你好\nworld\t世界'}
              />
              <Button
                type="button"
                className="mt-2"
                onClick={addBatch}
                disabled={savingBatch}
              >
                {savingBatch ? '导入中…' : '导入批量'}
              </Button>
            </div>

            <h2 className="mb-2 text-base font-semibold">卡片列表</h2>
            <div className="overflow-x-auto rounded border border-black/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-black/5">
                  <tr>
                    <th className="px-3 py-2 font-medium">正面</th>
                    <th className="px-3 py-2 font-medium">背面</th>
                    <th className="px-3 py-2 font-medium">记录</th>
                    <th className="px-3 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.cards.map((card) => (
                    <CardRow
                      key={card.id}
                      card={card}
                      onSave={updateCardRow}
                      onDelete={() => removeCard(card.id)}
                    />
                  ))}
                </tbody>
              </table>
              {detail.cards.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">暂无卡片，请先添加</div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

type CardRowProps = {
  card: StudyCardDto;
  onSave: (card: StudyCardDto, term: string, definition: string) => void;
  onDelete: () => void;
};

function CardRow({ card, onSave, onDelete }: CardRowProps) {
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);

  useEffect(() => {
    setTerm(card.term);
    setDefinition(card.definition);
  }, [card.term, card.definition]);

  const prog = card.progress;
  const progLabel = prog
    ? `对 ${prog.correctCount} / 错 ${prog.wrongCount}`
    : '未练习';

  return (
    <tr className="border-t border-black/10">
      <td className="px-3 py-2 align-top">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} className="min-w-[160px]" />
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="min-w-[200px]"
        />
      </td>
      <td className="px-3 py-2 align-top text-xs text-gray-600">{progLabel}</td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSave(card, term, definition)}
          >
            保存
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDelete}>
            删除
          </Button>
        </div>
      </td>
    </tr>
  );
}
