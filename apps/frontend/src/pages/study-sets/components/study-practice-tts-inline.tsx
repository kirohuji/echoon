import { useEffect, useMemo, useRef, useState } from 'react';

import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { cn } from 'src/lib/utils';
import type { SynthesizeSpeechWordTimestamp } from 'src/modules/document-library';

const NANOSECONDS_PER_SECOND = 1_000_000_000;
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainSeconds = wholeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
}

function shouldPrependSpace(current: string, previous?: string) {
  if (!previous) return false;
  if (!current) return true;
  if (/^[,.;:!?%)}\]，。！？；：]/.test(current)) return false;
  if (/^['’](?:s|d|m|re|ve|ll|t)\b/i.test(current)) return false;
  if (/^['’)）\]}]/.test(current)) return false;
  if (/^[(\[{“‘]$/.test(previous)) return false;
  return true;
}

function findActiveWordIndex(words: SynthesizeSpeechWordTimestamp[], currentTimeSeconds: number) {
  if (!words.length) return -1;
  const currentNs = Math.floor(currentTimeSeconds * NANOSECONDS_PER_SECOND);
  let left = 0;
  let right = words.length - 1;
  let answer = -1;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    if ((words[middle].start_time ?? 0) <= currentNs) {
      answer = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return answer;
}

type StudyPracticeTtsInlineProps = {
  audioUrl: string;
  wordTimestamps: SynthesizeSpeechWordTimestamp[] | null;
  /** 与朗读文本无关的前缀（如「请翻译：」），不参与时间戳对齐 */
  promptPrefix?: string;
  /** 实际朗读的文本；无词时间戳时与前缀一起原样展示 */
  spokenText: string;
};

/**
 * 练习专用：无波形图，逐词高亮直接做在题干上；控件仅进度条 + 播放 + 倍速。
 */
export function StudyPracticeTtsInline({
  audioUrl,
  wordTimestamps,
  promptPrefix,
  spokenText,
}: StudyPracticeTtsInlineProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const sortedWords = useMemo(() => {
    if (!wordTimestamps?.length) return [];
    return [...wordTimestamps].sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0));
  }, [wordTimestamps]);

  const activeWordIndex = useMemo(
    () => findActiveWordIndex(sortedWords, currentTime),
    [sortedWords, currentTime],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const syncTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const id = window.setInterval(() => {
      const a = audioRef.current;
      if (a) setCurrentTime(a.currentTime);
    }, 120);
    return () => clearInterval(id);
  }, [isPlaying, audioUrl]);

  const seekTo = (t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = duration || (Number.isFinite(audio.duration) ? audio.duration : 0);
    const clamped = Math.max(0, Math.min(max, t));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  };

  const hasWords = sortedWords.length > 0;

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      {hasWords ? (
        <p className="text-lg font-medium leading-relaxed text-slate-800">
          {promptPrefix ? <span className="text-slate-600">{promptPrefix}</span> : null}
          {sortedWords.map((w, i) => {
            const prev = sortedWords[i - 1];
            const prependSpace = shouldPrependSpace(w.text, prev?.text);
            const active = i === activeWordIndex;
            return (
              <span
                key={`${w.start_time}-${i}`}
                className={cn(
                  'rounded px-0.5 transition-colors',
                  active ? 'bg-amber-200/95 text-slate-900' : '',
                )}
              >
                {prependSpace ? ' ' : ''}
                {w.text}
              </span>
            );
          })}
        </p>
      ) : (
        <p className="text-lg font-medium leading-relaxed text-slate-800">
          {promptPrefix ? <span className="text-slate-600">{promptPrefix}</span> : null}
          {spokenText}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums text-slate-500">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          className="h-1 min-w-[120px] flex-1 cursor-pointer accent-indigo-600"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => seekTo(Number(e.target.value))}
        />
        <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-3 text-xs"
          onClick={() => {
            void togglePlay();
          }}
        >
          <Iconify
            icon={isPlaying ? 'solar:pause-circle-broken' : 'solar:play-circle-broken'}
            width={18}
          />
          {isPlaying ? '暂停' : '播放'}
        </Button>
        <div className="flex gap-1">
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] transition-colors',
                playbackRate === rate
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/90',
              )}
              onClick={() => setPlaybackRate(rate)}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {!hasWords ? (
        <p className="text-[10px] leading-snug text-slate-500">
          未获得词级时间戳。MiniMax 等可在服务端配置 WHISPER_INFERENCE_URL，由 whisper-server
          对合成音频对齐；或使用自带时间戳的 TTS（如 Cartesia）。
        </p>
      ) : null}
    </div>
  );
}
