import { Iconify } from 'src/components/iconify';
import { cn } from 'src/lib/utils';
import type { WordLookupDefinition } from 'src/modules/document-library';
import type { AudioPreviewDocument } from './audio-preview-dialog.types';
import { partOfSpeechBadgeClass } from './audio-preview-dialog.types';

type WordLookupSidebarProps = {
  doc: AudioPreviewDocument | null;
  selectedLookupWord: string;
  lookupLoading: boolean;
  lookupError: string;
  lookupDefinitions: WordLookupDefinition[];
  onClearLookup: () => void;
};

export function WordLookupSidebar({
  doc,
  selectedLookupWord,
  lookupLoading,
  lookupError,
  lookupDefinitions,
  onClearLookup,
}: WordLookupSidebarProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90',
        'shadow-sm ring-1 ring-black/[0.03]'
      )}
    >
      <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/90">
            <Iconify icon="solar:book-bookmark-bold-duotone" width={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-tight text-slate-800">单词释义</div>
            <div className="mt-px truncate text-[10px] leading-tight text-slate-500">
              {selectedLookupWord
                ? 'WordNet 英英释义'
                : doc?.wordTimestamps?.length
                  ? '在左侧歌词中长按单词'
                  : '无词级时间戳时可在正文中选词后自行查词典'}
            </div>
          </div>
        </div>
        {selectedLookupWord ? (
          <button
            type="button"
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClearLookup}
          >
            清空
          </button>
        ) : null}
      </div>

      <div className="px-2.5 pb-2 pt-2">
        {selectedLookupWord ? (
          <div className="mb-2 rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5">
            <div className="text-[9px] font-medium uppercase tracking-wider text-slate-400">所选词</div>
            <div className="mt-px text-base font-semibold capitalize tracking-tight text-slate-900">
              {selectedLookupWord}
            </div>
          </div>
        ) : null}

        <div className="max-h-[11rem] space-y-2 overflow-y-auto text-[12px] leading-snug">
          {lookupLoading ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-2 py-2.5 text-xs text-slate-500">
              <Iconify icon="svg-spinners:3-dots-fade" width={18} className="text-indigo-500" />
              正在查询释义…
            </div>
          ) : null}
          {!lookupLoading && lookupError ? (
            <div className="rounded-md border border-red-100 bg-red-50/90 px-2 py-1.5 text-xs text-red-700">
              {lookupError}
            </div>
          ) : null}
          {!lookupLoading && !lookupError && selectedLookupWord && lookupDefinitions.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-2 py-3 text-center text-xs text-slate-500">
              未找到该词的英文释义
            </div>
          ) : null}
          {!lookupLoading &&
            !lookupError &&
            lookupDefinitions.slice(0, 4).map((item, idx) => (
              <div
                key={`${item.partOfSpeech}-${idx}`}
                className="rounded-md border border-slate-100/90 bg-white p-2 shadow-sm"
              >
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2 py-px text-[9px] font-semibold uppercase tracking-wide',
                    partOfSpeechBadgeClass(item.partOfSpeech || '')
                  )}
                >
                  {(item.partOfSpeech || 'unknown').replace(/_/g, ' ')}
                </span>
                <p className="mt-1.5 text-xs text-slate-700">{item.gloss}</p>
                {item.synonyms?.length ? (
                  <div className="mt-1.5 border-t border-slate-100 pt-1.5">
                    <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-slate-400">相关词</div>
                    <div className="flex flex-wrap gap-0.5">
                      {item.synonyms.slice(0, 8).map((syn) => (
                        <span key={syn} className="rounded bg-slate-100 px-1.5 py-px text-[10px] text-slate-600">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
