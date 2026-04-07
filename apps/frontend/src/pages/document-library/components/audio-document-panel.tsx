import { useState, type MutableRefObject } from 'react';

import { Iconify } from 'src/components/iconify';
import { cn } from 'src/lib/utils';
import { AudioPreviewPlayer } from './audio-preview-player';
import type { AudioPreviewDocument } from './audio-preview-dialog.types';

type AudioMainTab = 'preview' | 'playback';

type VideoSyncSignal = {
  nonce: number;
  time: number;
  isPlaying: boolean;
  playbackRate: number;
};

type AudioDocumentPanelProps = {
  doc: AudioPreviewDocument | null;
  audioUrl: string;
  editableText: string;
  onEditableTextChange: (value: string) => void;
  videoElementRef: MutableRefObject<HTMLVideoElement | null>;
  videoSyncSignal: VideoSyncSignal;
  syncingFromAudioRef: MutableRefObject<boolean>;
  syncingFromVideoRef: MutableRefObject<boolean>;
  selectedLookupWord: string;
  onWordLongPress: (payload: { word: string; candidates: string[] }) => void;
};

export function AudioDocumentPanel({
  doc,
  audioUrl,
  editableText,
  onEditableTextChange,
  videoElementRef,
  videoSyncSignal,
  syncingFromAudioRef,
  syncingFromVideoRef,
  selectedLookupWord,
  onWordLongPress,
}: AudioDocumentPanelProps) {
  const [mainTab, setMainTab] = useState<AudioMainTab>('preview');
  const hasPlayback = doc?.audioStatus === 'success';

  return (
    <div
      className={cn(
        'flex min-h-0 h-full min-w-0 flex-col overflow-hidden rounded-2xl',
        'border border-slate-200/65 bg-white',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.06)]'
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100/95 bg-gradient-to-b from-slate-50/65 to-white px-3 py-2.5 sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/[0.09] text-indigo-600 ring-1 ring-indigo-500/10">
            <Iconify icon="solar:document-text-bold-duotone" width={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-tight text-slate-800">音频资料</p>
            <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">
              编辑正文 · 试听合成结果
            </p>
          </div>
        </div>
        <div
          className="inline-flex shrink-0 rounded-full bg-slate-100/95 p-0.5"
          role="tablist"
          aria-label="音频内容视图"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'preview'}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
              mainTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            )}
            onClick={() => setMainTab('preview')}
          >
            预览
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'playback'}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
              mainTab === 'playback'
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            )}
            onClick={() => setMainTab('playback')}
          >
            播放
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {mainTab === 'preview' ? (
          <textarea
            className="min-h-0 flex-1 resize-none bg-slate-50/35 px-3 py-2.5 text-[11px] leading-snug whitespace-pre-wrap break-words text-slate-800 outline-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/25 sm:px-3.5 sm:py-3"
            value={editableText}
            onChange={(e) => onEditableTextChange(e.target.value)}
            placeholder="这里可以编辑要生成音频的文本"
          />
        ) : hasPlayback ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/20">
            <AudioPreviewPlayer
              audioUrl={audioUrl}
              wordTimestamps={doc?.wordTimestamps}
              audioProvider={doc?.audioProvider}
              activeLookupWord={selectedLookupWord}
              embedFlexibleLyrics
              externalSyncSignal={videoSyncSignal}
              onSyncTime={(time) => {
                const videoEl = videoElementRef.current;
                if (!videoEl || syncingFromVideoRef.current) {
                  syncingFromVideoRef.current = false;
                  return;
                }
                if (Math.abs((videoEl.currentTime ?? 0) - time) > 0.2) {
                  syncingFromAudioRef.current = true;
                  videoEl.currentTime = time;
                }
              }}
              onSyncPlayState={(isPlaying) => {
                const videoEl = videoElementRef.current;
                if (!videoEl || syncingFromVideoRef.current) {
                  syncingFromVideoRef.current = false;
                  return;
                }
                syncingFromAudioRef.current = true;
                if (isPlaying) {
                  videoEl.play().catch(() => null);
                } else {
                  videoEl.pause();
                }
              }}
              onSyncPlaybackRate={(rate) => {
                const videoEl = videoElementRef.current;
                if (!videoEl || syncingFromVideoRef.current) {
                  syncingFromVideoRef.current = false;
                  return;
                }
                syncingFromAudioRef.current = true;
                videoEl.playbackRate = rate;
              }}
              onWordLongPress={onWordLongPress}
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center py-8 text-center',
              doc?.audioStatus === 'processing'
                ? 'bg-gradient-to-b from-blue-50/50 to-slate-50/30'
                : 'bg-slate-50/40'
            )}
          >
            {doc?.audioStatus === 'processing' ? (
              <div className="flex flex-col items-center gap-2 px-3">
                <Iconify icon="svg-spinners:bars-rotate-fade" width={28} className="text-blue-600" />
                <div>
                  <div className="text-xs font-semibold text-blue-950">音频生成中</div>
                  <p className="mt-0.5 text-[11px] text-blue-800/85 animate-pulse">
                    合成完成后将自动出现播放器
                  </p>
                </div>
              </div>
            ) : (
              <p className="px-3 text-xs text-slate-500">当前无音频，可在右侧配置参数后生成</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
