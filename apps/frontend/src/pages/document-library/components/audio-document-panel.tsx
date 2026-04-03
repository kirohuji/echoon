import type { MutableRefObject } from 'react';

import { Iconify } from 'src/components/iconify';
import { cn } from 'src/lib/utils';
import { AudioPreviewPlayer } from './audio-preview-player';
import type { AudioPreviewDocument } from './audio-preview-dialog.types';

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
  return (
    <div className="min-w-0 space-y-2">
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80',
          'px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.03]'
        )}
      >
        <div className="text-xs font-semibold text-slate-800">音频内容</div>
      </div>

      <textarea
        className="h-[22rem] w-full resize-none rounded-lg border border-slate-200/90 bg-white p-2.5 text-[11px] leading-snug whitespace-pre-wrap break-words text-slate-800 outline-none ring-slate-200 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-400/30"
        value={editableText}
        onChange={(e) => onEditableTextChange(e.target.value)}
        placeholder="这里可以编辑要生成音频的文本"
      />

      {doc?.audioStatus === 'success' ? (
        <AudioPreviewPlayer
          audioUrl={audioUrl}
          wordTimestamps={doc?.wordTimestamps}
          audioProvider={doc?.audioProvider}
          activeLookupWord={selectedLookupWord}
          lyricContainerHeight={150}
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
      ) : (
        <div
          className={cn(
            'rounded-xl border py-6 text-center',
            doc?.audioStatus === 'processing'
              ? 'border-blue-200/90 bg-gradient-to-b from-blue-50/70 to-white shadow-sm'
              : 'border-dashed border-slate-200 bg-slate-50/30'
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
  );
}
