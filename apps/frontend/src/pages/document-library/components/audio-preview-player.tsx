import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import AudioPlayer from 'react-audio-player';

import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { cn } from 'src/lib/utils';

type WordTimestamp = {
  start_time: number;
  text: string;
};

type AudioPreviewPlayerProps = {
  audioUrl: string;
  wordTimestamps?: WordTimestamp[] | null;
};

const NANOSECONDS_PER_SECOND = 1_000_000_000;
const SENTENCE_END_RE = /[.!?。！？；;:]$/;
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainSeconds = wholeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
}

function normalizeWordTimestamps(wordTimestamps?: WordTimestamp[] | null) {
  if (!wordTimestamps?.length) return [];

  // Cartesia 的 word_timestamps.start/end 是“秒”为单位（且通常以音频从 0s 开始为基准）。
  // 前端不要再对首词做减法归一化，否则会造成音频播放与逐词定位整体偏移。
  return [...wordTimestamps]
    .sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0))
    .map((item) => ({
      text: item.text,
      start_time: Math.max(0, item.start_time ?? 0),
    }));
}

function findActiveWordIndex(words: WordTimestamp[], currentTime: number) {
  if (!words.length) return -1;

  const currentNs = Math.floor(currentTime * NANOSECONDS_PER_SECOND);
  let left = 0;
  let right = words.length - 1;
  let answer = -1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    if (words[middle].start_time <= currentNs) {
      answer = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return answer;
}

function buildSentenceStarts(words: WordTimestamp[]) {
  if (!words.length) return [];

  const starts = [0];
  for (let index = 0; index < words.length - 1; index += 1) {
    if (SENTENCE_END_RE.test(words[index].text)) {
      starts.push(index + 1);
    }
  }

  return Array.from(new Set(starts)).sort((a, b) => a - b);
}

export function AudioPreviewPlayer({
  audioUrl,
  wordTimestamps,
}: AudioPreviewPlayerProps) {
  const audioPlayerRef = useRef<AudioPlayer>(null);
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const syncingWaveRef = useRef(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const normalizedWords = useMemo(() => normalizeWordTimestamps(wordTimestamps), [wordTimestamps]);

  const activeWordIndex = useMemo(
    () => findActiveWordIndex(normalizedWords, currentTime),
    [currentTime, normalizedWords]
  );

  const sentenceStarts = useMemo(() => buildSentenceStarts(normalizedWords), [normalizedWords]);

  const syncWaveProgress = (time: number) => {
    const waveSurfer = waveSurferRef.current;
    const waveDuration = waveSurfer?.getDuration?.() ?? duration;
    if (!waveSurfer || !waveDuration) return;

    syncingWaveRef.current = true;
    waveSurfer.seekTo(Math.max(0, Math.min(1, time / waveDuration)));
    window.setTimeout(() => {
      syncingWaveRef.current = false;
    }, 0);
  };

  const seekToTime = (nextTime: number) => {
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;

    const clampedTime = Math.max(0, Math.min(duration || audioElement.duration || 0, nextTime));
    audioElement.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    syncWaveProgress(clampedTime);
  };

  const jumpBy = (deltaSeconds: number) => {
    seekToTime(currentTime + deltaSeconds);
  };

  const jumpToSentence = (direction: 'previous' | 'next') => {
    if (!sentenceStarts.length) return;

    const currentIndex = activeWordIndex >= 0 ? activeWordIndex : findActiveWordIndex(normalizedWords, currentTime);

    if (direction === 'previous') {
      const previousStart = [...sentenceStarts].reverse().find((index) => index < Math.max(currentIndex, 0));
      const targetIndex = previousStart ?? 0;
      seekToTime((normalizedWords[targetIndex]?.start_time ?? 0) / NANOSECONDS_PER_SECOND);
      return;
    }

    const nextStart = sentenceStarts.find((index) => index > currentIndex);
    if (nextStart === undefined) return;
    seekToTime((normalizedWords[nextStart]?.start_time ?? 0) / NANOSECONDS_PER_SECOND);
  };

  const togglePlay = async () => {
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;

    if (audioElement.paused) {
      await audioElement.play();
      return;
    }

    audioElement.pause();
  };

  useEffect(() => {
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;
    audioElement.playbackRate = playbackRate;
  }, [audioUrl, playbackRate]);

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl || !waveContainerRef.current) return undefined;

    waveSurferRef.current?.destroy();

    const waveSurfer = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: '#d4d4d8',
      progressColor: '#111827',
      cursorColor: '#111827',
      height: 72,
      barWidth: 2,
      barGap: 2,
      barRadius: 4,
      normalize: true,
      url: audioUrl,
      interact: true,
      dragToSeek: true,
    });

    waveSurferRef.current = waveSurfer;

    waveSurfer.on('ready', () => {
      const nextDuration = waveSurfer.getDuration?.() ?? 0;
      if (nextDuration > 0) {
        setDuration((currentDuration) => (currentDuration > 0 ? currentDuration : nextDuration));
      }
    });

    waveSurfer.on('interaction', () => {
      if (syncingWaveRef.current) return;
      seekToTime(waveSurfer.getCurrentTime?.() ?? 0);
    });

    return () => {
      waveSurfer.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl]);

  const hasWords = normalizedWords.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3">
        <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>

        <div
          ref={waveContainerRef}
          className="min-h-[72px] w-full overflow-hidden rounded-md bg-white"
        />

        <input
          className="mt-3 w-full"
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => seekToTime(Number(e.target.value))}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="px-2"
              onClick={() => jumpToSentence('previous')}
              disabled={!hasWords}
            >
              <Iconify icon="solar:double-alt-arrow-left-bold" width={18} />
              上一句
            </Button>

            <Button variant="outline" size="sm" className="px-2" onClick={() => jumpBy(-10)}>
              <Iconify icon="solar:rewind-10-seconds-back-broken" width={18} />
              快退 10 秒
            </Button>

            <Button className="px-3" onClick={() => void togglePlay()}>
              <Iconify
                icon={isPlaying ? 'solar:pause-circle-broken' : 'solar:play-circle-broken'}
                width={18}
              />
              {isPlaying ? '暂停' : '播放'}
            </Button>

            <Button variant="outline" size="sm" className="px-2" onClick={() => jumpBy(10)}>
              <Iconify icon="solar:rewind-10-seconds-forward-broken" width={18} />
              快进 10 秒
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="px-2"
              onClick={() => jumpToSentence('next')}
              disabled={!hasWords}
            >
              下一句
              <Iconify icon="solar:double-alt-arrow-right-bold" width={18} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">倍速</span>
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={cn(
                  'rounded-md px-2 py-1 text-xs transition-colors',
                  playbackRate === rate ? 'bg-black text-white' : 'bg-white text-gray-700 ring-1 ring-black/10'
                )}
                onClick={() => setPlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-black/10">
        <div className="border-b border-black/10 px-3 py-2 text-sm font-medium">词时间戳</div>
        <div className="max-h-72 overflow-auto p-3 text-sm leading-7">
          {hasWords ? (
            normalizedWords.map((word, index) => (
              <button
                key={`${index}-${word.start_time}`}
                type="button"
                className={cn(
                  'mr-1 inline rounded px-1 py-0.5 text-left transition-colors',
                  index === activeWordIndex ? 'bg-yellow-300 text-black' : 'text-gray-800 hover:bg-black/5'
                )}
                onClick={() => seekToTime(word.start_time / NANOSECONDS_PER_SECOND)}
              >
                {word.text}
              </button>
            ))
          ) : (
            <div className="text-xs text-gray-500">
              该音频当前没有可用的真实词时间戳，暂不支持逐词定位。
            </div>
          )}
        </div>
      </div>

      <AudioPlayer
        ref={audioPlayerRef}
        src={audioUrl}
        controls={false}
        preload="metadata"
        listenInterval={200}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          syncWaveProgress(0);
        }}
        onLoadedMetadata={(event) => {
          const audioElement = event.currentTarget as HTMLAudioElement;
          if (Number.isFinite(audioElement.duration)) {
            setDuration(audioElement.duration);
          }
        }}
        onListen={(time) => {
          setCurrentTime(time);
          syncWaveProgress(time);
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
