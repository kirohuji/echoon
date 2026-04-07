import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import AudioPlayer from 'react-audio-player';

import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { cn } from 'src/lib/utils';

import { AudioWaveform, type AudioWaveformHandle } from './audio-waveform';

type WordTimestamp = {
  start_time: number;
  text: string;
  sentenceIndex?: number;
  sentenceText?: string;
  sentenceZh?: string;
};

type AudioPreviewPlayerProps = {
  audioUrl: string;
  wordTimestamps?: WordTimestamp[] | null;
  /** 用于无时间戳时的说明文案（如 minimax 不提供词级时间戳） */
  audioProvider?: string | null;
  activeLookupWord?: string;
  onWordLongPress?: (payload: { word: string; candidates: string[] }) => void;
  lyricContainerHeight?: number;
  onSyncTime?: (time: number) => void;
  onSyncPlayState?: (isPlaying: boolean) => void;
  onSyncPlaybackRate?: (rate: number) => void;
  externalSyncSignal?: {
    nonce: number;
    time: number;
    isPlaying: boolean;
    playbackRate: number;
  };
  /**
   * 嵌在限高父级（弹窗等）内时：歌词区用 flex 占满剩余高度，不再使用固定像素高度。
   */
  embedFlexibleLyrics?: boolean;
};

const NANOSECONDS_PER_SECOND = 1_000_000_000;
const SENTENCE_END_RE = /[.!?。！？；;:]$/;
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];
const IPHONE_VIEW_WIDTH = '100%';
/** 略缩小「手机框」总高度，避免在管理弹窗里占满视口 */
const IPHONE_VIEW_HEIGHT = 520;
const LONG_PRESS_MS = 450;
const SENTENCE_LOOP_GAP_MS = 2000;
const LOOP_END_EPSILON_NS = 80_000_000; // ~80ms，避免 listen 间隔漏检句尾

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
      sentenceIndex: item.sentenceIndex,
      sentenceText: item.sentenceText,
      sentenceZh: item.sentenceZh,
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

type SentenceSegment = {
  index: number;
  startWordIndex: number;
  startTimeNs: number;
  endTimeNs: number;
  text: string;
  textZh?: string;
  words: WordTimestamp[];
};

function buildSentenceSegments(words: WordTimestamp[]) {
  if (!words.length) return [] as SentenceSegment[];

  const starts = buildSentenceStarts(words);
  const segments: SentenceSegment[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const startIdx = starts[i];
    const endExclusive = starts[i + 1] ?? words.length;
    const sentenceWords = words.slice(startIdx, endExclusive);
    if (!sentenceWords.length) continue;
    const startTimeNs = sentenceWords[0].start_time;
    const nextSentenceStartNs = words[endExclusive]?.start_time;
    const fallbackEndNs = startTimeNs + 2 * NANOSECONDS_PER_SECOND;
    const sentenceText = sentenceWords.map((item) => item.text).join(' ');
    segments.push({
      index: i,
      startWordIndex: startIdx,
      startTimeNs,
      endTimeNs: nextSentenceStartNs ?? fallbackEndNs,
      text: sentenceText,
      textZh: sentenceWords.find((item) => item.sentenceZh)?.sentenceZh,
      words: sentenceWords,
    });
  }
  return segments;
}

function shouldPrependSpace(current: string, previous?: string) {
  if (!previous) return false;
  if (!current) return true;

  // 标点前不加空格，如 "hello,"、"world!"。
  if (/^[,.;:!?%)}\]，。！？；：]/.test(current)) return false;
  // 英文缩写片段前不加空格，如 I've / we're / don't。
  if (/^['’](?:s|d|m|re|ve|ll|t)\b/i.test(current)) return false;
  // 紧跟右侧引号/括号时不加空格。
  if (/^['’)）\]}]/.test(current)) return false;
  // 前一个 token 是左引号或左括号时不加空格。
  if (/^[(\[{“‘]$/.test(previous)) return false;

  return true;
}

function sanitizeLookupWord(text: string) {
  return text.replace(/^[^A-Za-z0-9\u00C0-\u024F']+|[^A-Za-z0-9\u00C0-\u024F']+$/g, '').trim();
}

function joinTokens(tokens: string[]) {
  return tokens.reduce((acc, token, index) => {
    const prev = index > 0 ? tokens[index - 1] : undefined;
    const withSpace = shouldPrependSpace(token, prev);
    return `${acc}${withSpace ? ' ' : ''}${token}`;
  }, '');
}

function buildPhraseCandidates(sentenceWords: WordTimestamp[], focusIdx: number) {
  const candidates: string[] = [];
  for (let length = 4; length >= 2; length -= 1) {
    const minStart = Math.max(0, focusIdx - (length - 1));
    const maxStart = Math.min(focusIdx, sentenceWords.length - length);
    for (let start = minStart; start <= maxStart; start += 1) {
      const chunk = sentenceWords.slice(start, start + length).map((item) => sanitizeLookupWord(item.text)).filter(Boolean);
      if (chunk.length < 2) continue;
      const phrase = joinTokens(chunk).toLowerCase();
      if (phrase.includes(' ') && !candidates.includes(phrase)) candidates.push(phrase);
    }
  }
  return candidates;
}

function tokenizeLookupPhrase(phrase: string) {
  return phrase
    .split(/\s+/)
    .map((item) => sanitizeLookupWord(item).toLowerCase())
    .filter(Boolean);
}

function segmentIndexForWordIndex(segments: SentenceSegment[], wordIndex: number) {
  return segments.findIndex(
    (s) => wordIndex >= s.startWordIndex && wordIndex < s.startWordIndex + s.words.length
  );
}

export function AudioPreviewPlayer({
  audioUrl,
  wordTimestamps,
  audioProvider,
  activeLookupWord,
  onWordLongPress,
  lyricContainerHeight,
  onSyncTime,
  onSyncPlayState,
  onSyncPlaybackRate,
  externalSyncSignal,
  embedFlexibleLyrics = false,
}: AudioPreviewPlayerProps) {
  const audioPlayerRef = useRef<AudioPlayer>(null);
  const waveformRef = useRef<AudioWaveformHandle | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showWordTimestamps, setShowWordTimestamps] = useState(true);
  const [sentenceLoopEnabled, setSentenceLoopEnabled] = useState(false);
  const [loopSegmentIndex, setLoopSegmentIndex] = useState(0);
  const lyricContainerRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const loopGapTimerRef = useRef<number | null>(null);
  const sentenceLoopPendingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const seekToTimeRef = useRef<(t: number, userIntent?: boolean) => void>(() => {});
  const sentenceLoopEnabledRef = useRef(false);
  const loopSegmentIndexRef = useRef(0);

  useEffect(() => {
    sentenceLoopEnabledRef.current = sentenceLoopEnabled;
  }, [sentenceLoopEnabled]);
  useEffect(() => {
    loopSegmentIndexRef.current = loopSegmentIndex;
  }, [loopSegmentIndex]);

  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const normalizedWords = useMemo(() => normalizeWordTimestamps(wordTimestamps), [wordTimestamps]);
  const normalizedActiveLookupWord = (activeLookupWord || '').toLowerCase();
  const activeLookupTokens = useMemo(
    () => tokenizeLookupPhrase(normalizedActiveLookupWord),
    [normalizedActiveLookupWord]
  );
  const sentenceSegments = useMemo(
    () => buildSentenceSegments(normalizedWords),
    [normalizedWords]
  );

  const sentenceSegmentsRef = useRef<SentenceSegment[]>([]);
  useEffect(() => {
    sentenceSegmentsRef.current = sentenceSegments;
  }, [sentenceSegments]);

  const activeWordIndex = useMemo(
    () => findActiveWordIndex(normalizedWords, currentTime),
    [currentTime, normalizedWords]
  );

  const sentenceStarts = useMemo(() => buildSentenceStarts(normalizedWords), [normalizedWords]);
  const activeSentenceIndex = useMemo(() => {
    if (!sentenceSegments.length) return -1;
    const currentNs = Math.floor(currentTime * NANOSECONDS_PER_SECOND);
    const found = sentenceSegments.findIndex(
      (item, index) =>
        currentNs >= item.startTimeNs &&
        (currentNs < item.endTimeNs || index === sentenceSegments.length - 1)
    );
    return found;
  }, [currentTime, sentenceSegments]);

  const syncWaveProgress = (time: number) => {
    waveformRef.current?.syncProgress(time);
  };

  const seekToTime = (nextTime: number, userIntent = false) => {
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;

    const clampedTime = Math.max(0, Math.min(duration || audioElement.duration || 0, nextTime));
    audioElement.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    syncWaveProgress(clampedTime);
    if (userIntent) {
      sentenceLoopPendingRef.current = false;
      if (loopGapTimerRef.current) {
        window.clearTimeout(loopGapTimerRef.current);
        loopGapTimerRef.current = null;
      }
    }
  };

  seekToTimeRef.current = seekToTime;

  const jumpBy = (deltaSeconds: number) => {
    seekToTime(currentTime + deltaSeconds, true);
  };

  const jumpToSentence = (direction: 'previous' | 'next') => {
    if (!sentenceStarts.length) return;

    const currentIndex = activeWordIndex >= 0 ? activeWordIndex : findActiveWordIndex(normalizedWords, currentTime);

    if (direction === 'previous') {
      const previousStart = [...sentenceStarts].reverse().find((index) => index < Math.max(currentIndex, 0));
      const targetWordIndex = previousStart ?? 0;
      seekToTime((normalizedWords[targetWordIndex]?.start_time ?? 0) / NANOSECONDS_PER_SECOND, true);
      if (sentenceLoopEnabled) {
        const si = segmentIndexForWordIndex(sentenceSegments, targetWordIndex);
        if (si >= 0) setLoopSegmentIndex(si);
      }
      return;
    }

    const nextStart = sentenceStarts.find((index) => index > currentIndex);
    if (nextStart === undefined) return;
    seekToTime((normalizedWords[nextStart]?.start_time ?? 0) / NANOSECONDS_PER_SECOND, true);
    if (sentenceLoopEnabled) {
      const si = segmentIndexForWordIndex(sentenceSegments, nextStart);
      if (si >= 0) setLoopSegmentIndex(si);
    }
  };

  const togglePlay = async () => {
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;

    if (audioElement.paused) {
      await audioElement.play();
      return;
    }

    audioElement.pause();
    sentenceLoopPendingRef.current = false;
    if (loopGapTimerRef.current) {
      window.clearTimeout(loopGapTimerRef.current);
      loopGapTimerRef.current = null;
    }
  };

  useEffect(() => {
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;
    audioElement.playbackRate = playbackRate;
    onSyncPlaybackRate?.(playbackRate);
  }, [audioUrl, playbackRate, onSyncPlaybackRate]);

  useEffect(() => {
    if (!externalSyncSignal) return;
    const audioElement = audioPlayerRef.current?.audioEl?.current;
    if (!audioElement) return;
    const nextRate = externalSyncSignal.playbackRate || 1;
    if (playbackRate !== nextRate) {
      setPlaybackRate(nextRate);
    }
    seekToTime(externalSyncSignal.time, false);
    if (externalSyncSignal.isPlaying) {
      void audioElement.play();
    } else {
      audioElement.pause();
    }
  }, [externalSyncSignal?.nonce]);

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowWordTimestamps(true);
    setSentenceLoopEnabled(false);
    setLoopSegmentIndex(0);
    sentenceLoopPendingRef.current = false;
    if (loopGapTimerRef.current) {
      window.clearTimeout(loopGapTimerRef.current);
      loopGapTimerRef.current = null;
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!sentenceLoopEnabled) {
      sentenceLoopPendingRef.current = false;
      if (loopGapTimerRef.current) {
        window.clearTimeout(loopGapTimerRef.current);
        loopGapTimerRef.current = null;
      }
    }
  }, [sentenceLoopEnabled]);

  useEffect(() => {
    return () => {
      if (loopGapTimerRef.current) window.clearTimeout(loopGapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!lyricContainerRef.current) return;
    if (activeSentenceIndex < 0) return;
    const activeElement = lyricContainerRef.current.querySelector<HTMLElement>(
      `[data-lyric-index="${activeSentenceIndex}"]`
    );
    if (!activeElement) return;
    activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeSentenceIndex]);

  const hasWords = normalizedWords.length > 0;

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (
    wordText: string,
    sentenceWords: WordTimestamp[],
    wordIdx: number,
    event: PointerEvent<HTMLSpanElement>
  ) => {
    clearLongPressTimer();
    void event;
    const lookupText = sanitizeLookupWord(wordText);
    const displayText = lookupText || wordText;
    const candidates = buildPhraseCandidates(sentenceWords, wordIdx);

    longPressTimerRef.current = window.setTimeout(() => {
      onWordLongPress?.({ word: displayText.toLowerCase(), candidates });
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    clearLongPressTimer();
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  const lyricBoxStyle = embedFlexibleLyrics
    ? undefined
    : { height: lyricContainerHeight ?? IPHONE_VIEW_HEIGHT - 268 };

  return (
    <div
      className={cn(
        embedFlexibleLyrics ? 'flex h-full min-h-0 flex-col gap-2' : 'space-y-2'
      )}
    >
      <div className={cn('flex justify-center', embedFlexibleLyrics && 'min-h-0 flex-1')}>
        <div
          className={cn(
            'rounded-xl border-slate-200/90 bg-white p-1.5 shadow-sm',
            embedFlexibleLyrics &&
              'flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-hidden'
          )}
          style={{ width: IPHONE_VIEW_WIDTH, maxWidth: '100%' }}
        >
          <div
            ref={lyricContainerRef}
            className={cn(
              'overflow-y-auto px-1.5 py-1.5 pr-4',
              embedFlexibleLyrics && 'min-h-[6.5rem] flex-1 basis-0'
            )}
            style={lyricBoxStyle}
          >
            {sentenceSegments.length ? (
              <div className="space-y-3">
                {sentenceSegments.map((sentence, index) => (
                  <div
                    key={`${sentence.startTimeNs}-${sentence.index}`}
                    data-lyric-index={index}
                    className={cn(
                      'w-full text-left text-sm leading-6 transition-all break-normal',
                      index === activeSentenceIndex
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-400 hover:text-slate-600',
                      sentenceLoopEnabled &&
                        loopSegmentIndex === index &&
                        'rounded-lg px-2 py-1.5 ring-2 ring-inset ring-blue-500/55'
                    )}
                  >
                    <button
                      type="button"
                      className="mb-1 block w-full rounded text-left"
                      onClick={() => {
                        seekToTime(sentence.startTimeNs / NANOSECONDS_PER_SECOND, true);
                        if (sentenceLoopEnabled) setLoopSegmentIndex(index);
                      }}
                    >
                      <span className="block whitespace-normal text-left">
                        {showWordTimestamps ? (
                          (() => {
                            const highlightedIndices = new Set<number>();
                            if (activeLookupTokens.length > 1) {
                              for (
                                let start = 0;
                                start <= sentence.words.length - activeLookupTokens.length;
                                start += 1
                              ) {
                                const matched = activeLookupTokens.every((token, offset) => {
                                  const target = sanitizeLookupWord(
                                    sentence.words[start + offset]?.text
                                  ).toLowerCase();
                                  return target === token;
                                });
                                if (matched) {
                                  for (let k = 0; k < activeLookupTokens.length; k += 1) {
                                    highlightedIndices.add(sentence.startWordIndex + start + k);
                                  }
                                }
                              }
                            }
                            return sentence.words.map((word, wordIdx) => {
                              const globalWordIndex = sentence.startWordIndex + wordIdx;
                              const isActiveWord = globalWordIndex === activeWordIndex;
                              const normalizedCurrentWord = sanitizeLookupWord(word.text).toLowerCase();
                              const isLookupWordActive =
                                (activeLookupTokens.length <= 1 &&
                                  Boolean(normalizedActiveLookupWord) &&
                                  normalizedCurrentWord === normalizedActiveLookupWord) ||
                                highlightedIndices.has(globalWordIndex);
                              const prev = sentence.words[wordIdx - 1];
                              const prependSpace = shouldPrependSpace(word.text, prev?.text);
                              const candidates = buildPhraseCandidates(sentence.words, wordIdx);
                              return (
                                <span
                                  key={`${word.start_time}-${wordIdx}`}
                                  className={cn(
                                    'rounded px-0.5',
                                    isActiveWord ? 'bg-yellow-300 text-black' : '',
                                    isLookupWordActive
                                      ? 'bg-amber-100 text-black underline decoration-1 decoration-wavy decoration-amber-500'
                                      : ''
                                  )}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    onWordLongPress?.({
                                      word: normalizedCurrentWord || word.text.toLowerCase(),
                                      candidates,
                                    });
                                  }}
                                  onPointerDown={(event) =>
                                    startLongPress(word.text, sentence.words, wordIdx, event)
                                  }
                                  onPointerUp={cancelLongPress}
                                  onPointerLeave={cancelLongPress}
                                  onPointerCancel={cancelLongPress}
                                >
                                  {prependSpace ? ` ${word.text}` : word.text}
                                </span>
                              );
                            });
                          })()
                        ) : (
                          sentence.text
                        )}
                      </span>
                    </button>
                    {index === activeSentenceIndex ? (
                      <div className="text-left text-[10px] font-normal leading-snug text-slate-500">
                        {sentence.textZh || '暂无中文翻译'}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-8 text-center text-[10px] leading-snug text-slate-500">
                {audioProvider === 'minimax' ? (
                  <>
                    MiniMax 合成的音频不提供词级时间戳。下方仍可使用波形、进度条与倍速播放；逐词高亮、句子跳转与歌词内查词不可用。
                  </>
                ) : (
                  <>该音频没有词级时间戳，仅支持波形与进度控制；逐词歌词与句子跳转不可用。</>
                )}
              </div>
            )}
          </div>

          {hasWords ? (
            <div className="mt-1.5 shrink-0 space-y-1 border-t border-slate-100 px-0.5 pt-1.5 text-left text-[10px] leading-snug text-slate-600">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={showWordTimestamps}
                  onChange={(e) => setShowWordTimestamps(e.target.checked)}
                />
                <span>显示词级时间戳（逐词高亮、划词查词）</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={sentenceLoopEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setSentenceLoopEnabled(on);
                    if (on && sentenceSegments.length > 0) {
                      const si = activeSentenceIndex >= 0 ? activeSentenceIndex : 0;
                      setLoopSegmentIndex(Math.min(si, sentenceSegments.length - 1));
                    }
                  }}
                />
                <span>
                  单句循环：句末自动暂停 2 秒后重播该句；用「上一句/下一句」或点击歌词行可切换要循环的句子。
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-1 flex shrink-0 items-center justify-between text-[10px] tabular-nums text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>

          <AudioWaveform
            ref={waveformRef}
            className="mt-1 shrink-0"
            audioUrl={audioUrl}
            durationSeconds={duration}
            onSeek={(time) => seekToTime(time, true)}
            onReady={(nextDuration) =>
              setDuration((currentDuration) => (currentDuration > 0 ? currentDuration : nextDuration))
            }
          />

          <input
            className="mt-1.5 h-1.5 w-full shrink-0 cursor-pointer accent-indigo-600"
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekToTime(Number(e.target.value), true)}
          />

          <div className="mt-2 flex shrink-0 items-center justify-between gap-1">
            <Button variant="outline" size="sm" className="h-7 px-1.5" onClick={() => jumpBy(-10)}>
              <Iconify icon="solar:rewind-10-seconds-back-broken" width={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-1.5"
              onClick={() => jumpToSentence('previous')}
              disabled={!hasWords}
            >
              <Iconify icon="solar:double-alt-arrow-left-bold" width={16} />
            </Button>
            <Button size="sm" className="h-8 px-3" onClick={() => void togglePlay()}>
              <Iconify
                icon={isPlaying ? 'solar:pause-circle-broken' : 'solar:play-circle-broken'}
                width={17}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-1.5"
              onClick={() => jumpToSentence('next')}
              disabled={!hasWords}
            >
              <Iconify icon="solar:double-alt-arrow-right-bold" width={16} />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-1.5" onClick={() => jumpBy(10)}>
              <Iconify icon="solar:rewind-10-seconds-forward-broken" width={16} />
            </Button>
          </div>

          <div className="mt-2 flex shrink-0 items-center justify-center gap-1">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] transition-colors',
                  playbackRate === rate
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/90'
                )}
                onClick={() => setPlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <AudioPlayer
        ref={audioPlayerRef}
        src={audioUrl}
        controls={false}
        preload="metadata"
        listenInterval={200}
        onPlay={() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          onSyncPlayState?.(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
          onSyncPlayState?.(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
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
          onSyncTime?.(time);

          const segments = sentenceSegmentsRef.current;
          if (!sentenceLoopEnabledRef.current || !segments.length) return;
          if (!isPlayingRef.current || sentenceLoopPendingRef.current) return;

          const seg = segments[loopSegmentIndexRef.current];
          if (!seg) return;

          const tNs = Math.floor(time * NANOSECONDS_PER_SECOND);
          const dur = durationRef.current;
          const durationNs =
            dur > 0 && Number.isFinite(dur) ? Math.floor(dur * NANOSECONDS_PER_SECOND) : seg.endTimeNs;
          const effectiveEndNs = Math.min(seg.endTimeNs, durationNs);
          if (tNs < effectiveEndNs - LOOP_END_EPSILON_NS) return;

          const audioElement = audioPlayerRef.current?.audioEl?.current;
          if (!audioElement) return;

          sentenceLoopPendingRef.current = true;
          audioElement.pause();

          if (loopGapTimerRef.current) window.clearTimeout(loopGapTimerRef.current);
          const startSec = seg.startTimeNs / NANOSECONDS_PER_SECOND;
          loopGapTimerRef.current = window.setTimeout(() => {
            loopGapTimerRef.current = null;
            seekToTimeRef.current(startSec, false);
            void audioElement.play().finally(() => {
              sentenceLoopPendingRef.current = false;
            });
          }, SENTENCE_LOOP_GAP_MS);
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
