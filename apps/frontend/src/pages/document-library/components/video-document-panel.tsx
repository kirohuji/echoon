import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { cn } from 'src/lib/utils';
import type { AudioPreviewDocument } from './audio-preview-dialog.types';
import { AudioPreviewPlayer } from './audio-preview-player';

type VideoSyncSignal = {
  nonce: number;
  time: number;
  isPlaying: boolean;
  playbackRate: number;
};

type VideoDocumentPanelProps = {
  doc: AudioPreviewDocument | null;
  videoUrl: string;
  audioUrl: string;
  videoElementRef: MutableRefObject<HTMLVideoElement | null>;
  videoWhisperTemperature: string;
  setVideoWhisperTemperature: Dispatch<SetStateAction<string>>;
  videoSplitOnWord: boolean;
  setVideoSplitOnWord: Dispatch<SetStateAction<boolean>>;
  onTranscribeVideo: () => void;
  canRegenerate: boolean;
  isVideoAnalyzing: boolean;
  videoSyncSignal: VideoSyncSignal;
  setVideoSyncSignal: Dispatch<SetStateAction<VideoSyncSignal>>;
  syncingFromAudioRef: MutableRefObject<boolean>;
  syncingFromVideoRef: MutableRefObject<boolean>;
  selectedLookupWord: string;
  onWordLongPress: (payload: { word: string; candidates: string[] }) => void;
};

export function VideoDocumentPanel({
  doc,
  videoUrl,
  audioUrl,
  videoElementRef,
  videoWhisperTemperature,
  setVideoWhisperTemperature,
  videoSplitOnWord,
  setVideoSplitOnWord,
  onTranscribeVideo,
  canRegenerate,
  isVideoAnalyzing,
  videoSyncSignal,
  setVideoSyncSignal,
  syncingFromAudioRef,
  syncingFromVideoRef,
  selectedLookupWord,
  onWordLongPress,
}: VideoDocumentPanelProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80',
          'px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.03]'
        )}
      >
        <div className="text-xs font-semibold text-slate-800">视频预览</div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="preview-video-split-on-word"
            className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-slate-700"
          >
            <input
              id="preview-video-split-on-word"
              type="checkbox"
              checked={videoSplitOnWord}
              onChange={(e) => setVideoSplitOnWord(e.target.checked)}
              disabled={isVideoAnalyzing}
            />
            splitOnWord
          </label>
          <input
            className="h-7 w-20 rounded border border-slate-200 px-2 text-[11px] text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
            value={videoWhisperTemperature}
            onChange={(e) => setVideoWhisperTemperature(e.target.value)}
            placeholder="0.2"
            title="Whisper temperature (0-1)"
            disabled={isVideoAnalyzing}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onTranscribeVideo}
            disabled={!canRegenerate || isVideoAnalyzing}
          >
            {isVideoAnalyzing ? (
              <span className="inline-flex items-center gap-1.5">
                <Iconify icon="svg-spinners:3-dots-scale" width={14} />
                分析中...
              </span>
            ) : (
              '分析视频'
            )}
          </Button>
        </div>
      </div>

      {videoUrl ? (
        <div className="relative">
          <video
            ref={videoElementRef}
            className="h-[22rem] w-full rounded-lg border border-slate-200/90 bg-black object-contain"
            src={videoUrl}
            controls={false}
            muted
            preload="metadata"
            playsInline
            disablePictureInPicture
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            onPlay={() => {
              if (syncingFromAudioRef.current) {
                syncingFromAudioRef.current = false;
                return;
              }
              syncingFromVideoRef.current = true;
              setVideoSyncSignal((prev) => ({
                ...prev,
                nonce: prev.nonce + 1,
                isPlaying: true,
              }));
            }}
            onPause={() => {
              if (syncingFromAudioRef.current) {
                syncingFromAudioRef.current = false;
                return;
              }
              syncingFromVideoRef.current = true;
              const currentTime = videoElementRef.current?.currentTime ?? 0;
              setVideoSyncSignal((prev) => ({
                ...prev,
                nonce: prev.nonce + 1,
                time: currentTime,
                isPlaying: false,
              }));
            }}
            onRateChange={() => {
              if (syncingFromAudioRef.current) {
                syncingFromAudioRef.current = false;
                return;
              }
              const rate = videoElementRef.current?.playbackRate ?? 1;
              syncingFromVideoRef.current = true;
              setVideoSyncSignal((prev) => ({
                ...prev,
                nonce: prev.nonce + 1,
                playbackRate: rate,
              }));
            }}
            onSeeked={() => {
              if (syncingFromAudioRef.current) {
                syncingFromAudioRef.current = false;
                return;
              }
              const currentTime = videoElementRef.current?.currentTime ?? 0;
              syncingFromVideoRef.current = true;
              setVideoSyncSignal((prev) => ({
                ...prev,
                nonce: prev.nonce + 1,
                time: currentTime,
              }));
            }}
          />
          {isVideoAnalyzing ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/35">
              <div className="flex items-center gap-2 rounded-md bg-white/90 px-3 py-2 text-xs font-medium text-slate-800 shadow">
                <Iconify icon="svg-spinners:3-dots-scale" width={18} className="text-blue-600" />
                视频分析执行中...
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex h-[22rem] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
          视频暂不可预览
        </div>
      )}

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
