import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import WaveSurfer from 'wavesurfer.js';
import ReactAudioPlayer from 'react-audio-player';

import { CONFIG } from '../config';
import { STORAGE_KEY } from '../auth/constant';
import { http } from '../lib/http';

type WordTimestamp = {
  start_time: number;
  text: string;
};

type DocumentData = {
  title?: string;
  content: string;
  wordTimestamps: WordTimestamp[];
};

export function ReadingPlayerPage() {
  const { id } = useParams();

  const audioPlayerRef = useRef<ReactAudioPlayer>(null);
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const sleepTimerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepMinutes, setSleepMinutes] = useState<number>(0); // 0 = off

  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  const wordTimestamps = useMemo(() => doc?.wordTimestamps ?? [], [doc]);

  const normalizedWords = useMemo(() => {
    if (!wordTimestamps.length) return [];

    const baseTime = wordTimestamps[0].start_time ?? 0;
    return wordTimestamps.map((w) => ({
      ...w,
      start_time: (w.start_time ?? 0) - baseTime,
    }));
  }, [wordTimestamps]);

  const highlightNow = (timeSeconds: number) => {
    const words = normalizedWords;
    if (!words.length) return;

    // Backend word timestamps are in "nano" units (same as the old web reading page logic).
    const currentNs = Math.floor(timeSeconds * 1_000_000_000);

    let idx = -1;
    for (let i = 0; i < words.length; i += 1) {
      if (currentNs >= words[i].start_time) idx = i;
      else break;
    }
    setActiveWordIndex(idx);
  };

  const cleanupWave = () => {
    waveSurferRef.current?.destroy();
    waveSurferRef.current = null;
  };

  useEffect(() => {
    let objectUrl: string | null = null;

    const load = async () => {
      if (!id) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const documentRes = await http.get<DocumentData>(`/document/${id}`);
        setDoc(documentRes);

        const token = sessionStorage.getItem(STORAGE_KEY);
        if (!token) throw new Error('Missing login token.');

        const audioRes = await fetch(`${CONFIG.serverUrl}/document/${id}/audio`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!audioRes.ok) {
          throw new Error(`Failed to load audio: ${audioRes.status}`);
        }

        const blob = await audioRes.blob();
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  // Create waveform when audioUrl changes.
  useEffect(() => {
    if (!audioUrl || !waveContainerRef.current) return;

    cleanupWave();

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: '#e5e7eb',
      progressColor: '#f59e0b',
      cursorColor: '#f59e0b',
      height: 72,
      barWidth: 2,
      barGap: 2,
      responsive: true,
      normalize: true,
      url: audioUrl,
      // Keep waveform purely as a visualizer; actual playback is driven by ReactAudioPlayer.
      interact: false,
    } as any);

    waveSurferRef.current = ws;

    ws.on('ready', () => {
      const d = ws.getDuration?.() ?? 0;
      setDuration(d);
    });

    return () => cleanupWave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Apply playback rate to the underlying HTMLAudioElement.
  useEffect(() => {
    const audioEl = audioPlayerRef.current?.audioEl?.current;
    if (!audioEl) return;
    audioEl.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  // Sleep timer.
  useEffect(() => {
    if (!isPlaying) return;

    if (!sleepMinutes) return;

    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    const ms = sleepMinutes * 60 * 1000;
    sleepTimerRef.current = window.setTimeout(() => {
      const audioEl = audioPlayerRef.current?.audioEl?.current;
      audioEl?.pause();
      setSleepMinutes(0);
    }, ms);

    return () => {
      if (sleepTimerRef.current) {
        window.clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    };
  }, [isPlaying, sleepMinutes]);

  const handlePlayPause = async () => {
    const audioEl = audioPlayerRef.current?.audioEl?.current;
    if (!audioEl) return;

    if (audioEl.paused) {
      await audioEl.play();
    } else {
      audioEl.pause();
    }
  };

  const handleSeek = (nextTimeSeconds: number) => {
    const audioEl = audioPlayerRef.current?.audioEl?.current;
    if (!audioEl) return;

    audioEl.currentTime = nextTimeSeconds;
    setCurrentTime(nextTimeSeconds);
    highlightNow(nextTimeSeconds);

    const ws = waveSurferRef.current;
    if (ws && ws.getDuration?.()) {
      const d = ws.getDuration();
      if (d > 0) ws.seekTo(nextTimeSeconds / d);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="text-sm text-red-600">{errorMsg}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            {doc?.title ? doc.title : 'Reading'}
          </div>
          <div className="text-xs text-gray-500">Document id: {id}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
            onClick={handlePlayPause}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div ref={waveContainerRef} className="mb-2 w-full" />

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>{currentTime.toFixed(1)}s</div>
          <div>{duration ? duration.toFixed(1) : '--'}s</div>
        </div>

        <input
          className="mt-2 w-full"
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => handleSeek(Number(e.target.value))}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-gray-500">Speed</div>
            {[0.75, 1, 1.25, 1.5].map((r) => (
              <button
                key={r}
                type="button"
                className={`rounded-md px-2 py-1 text-xs ${
                  playbackRate === r
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
                onClick={() => setPlaybackRate(r)}
              >
                {r}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">Sleep</div>
            <select
              className="rounded-md border bg-white px-2 py-1 text-xs"
              value={sleepMinutes}
              onChange={(e) => setSleepMinutes(Number(e.target.value))}
            >
              <option value={0}>Off</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border p-3">
        <div className="mb-2 text-xs font-medium text-gray-700">
          {normalizedWords.length ? 'Words' : 'No word timestamps.'}
        </div>

        <div className="max-h-[45vh] space-x-1 overflow-auto text-sm leading-7">
          {normalizedWords.map((w, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`${i}-${w.start_time}`}
              className={`inline-block rounded-sm px-0.5 py-0.5 transition-colors ${
                i === activeWordIndex
                  ? 'bg-yellow-300 text-gray-900'
                  : 'text-gray-900'
              }`}
            >
              {w.text}{' '}
            </span>
          ))}
        </div>
      </div>

      <ReactAudioPlayer
        ref={audioPlayerRef}
        src={audioUrl ?? undefined}
        controls={false}
        preload="metadata"
        listenInterval={200}
        volume={1}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          setActiveWordIndex(-1);
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget as HTMLAudioElement;
          if (!Number.isFinite(el.duration)) return;
          setDuration(el.duration);
        }}
        onListen={(time) => {
          setCurrentTime(time);
          highlightNow(time);

          const ws = waveSurferRef.current;
          if (ws && ws.getDuration?.()) {
            const d = ws.getDuration();
            if (d > 0) ws.seekTo(time / d);
          }
        }}
      />
    </div>
  );
}

