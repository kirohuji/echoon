import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import WavesurferPlayer from '@wavesurfer/react';
import type WaveSurfer from 'wavesurfer.js';

import { cn } from 'src/lib/utils';

export type AudioWaveformHandle = {
  syncProgress: (timeSeconds: number) => void;
};

type AudioWaveformProps = {
  audioUrl: string;
  /** 主播放器时长，用于在 WaveSurfer 尚未 ready 时估算进度比例 */
  durationSeconds: number;
  onSeek: (timeSeconds: number) => void;
  /** WaveSurfer 解码完成且能读到时长时触发（用于在 HTML audio 尚未回填 duration 时补全） */
  onReady?: (durationSeconds: number) => void;
  className?: string;
};

export const AudioWaveform = forwardRef<AudioWaveformHandle, AudioWaveformProps>(
  ({ audioUrl, durationSeconds, onSeek, onReady, className }, ref) => {
    const waveSurferRef = useRef<WaveSurfer | null>(null);
    const syncingWaveRef = useRef(false);

    const onSeekRef = useRef(onSeek);
    const onReadyRef = useRef(onReady);
    useEffect(() => {
      onSeekRef.current = onSeek;
    }, [onSeek]);
    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      waveSurferRef.current = null;
      console.log('audioUrl', audioUrl);
    }, [audioUrl]);

    useImperativeHandle(
      ref,
      () => ({
        syncProgress(timeSeconds: number) {
          const waveSurfer = waveSurferRef.current;
          const waveDuration = waveSurfer?.getDuration?.() ?? durationSeconds;
          if (!waveSurfer || !waveDuration) return;

          syncingWaveRef.current = true;
          waveSurfer.seekTo(Math.max(0, Math.min(1, timeSeconds / waveDuration)));
          window.setTimeout(() => {
            syncingWaveRef.current = false;
          }, 0);
        },
      }),
      [durationSeconds]
    );

    const shellClassName = cn('min-h-[44px] w-full overflow-hidden bg-white', className);

    if (!audioUrl) {
      return <div className={shellClassName} />;
    }

    return (
      <div className={shellClassName}>
        <WavesurferPlayer
          url={audioUrl}
          waveColor="#d4d4d8"
          progressColor="#111827"
          cursorColor="#111827"
          height={72}
          barWidth={2}
          barGap={2}
          barRadius={4}
          normalize
          interact
          dragToSeek
          onReady={(ws, decodedDuration) => {
            waveSurferRef.current = ws;
            const nextDuration =
              decodedDuration > 0 ? decodedDuration : ws.getDuration?.() ?? 0;
            if (nextDuration > 0) {
              onReadyRef.current?.(nextDuration);
            }
          }}
          onDestroy={(ws) => {
            if (waveSurferRef.current === ws) {
              waveSurferRef.current = null;
            }
          }}
          onInteraction={(_ws, newTime) => {
            if (syncingWaveRef.current) return;
            onSeekRef.current(newTime);
          }}
        />
      </div>
    );
  }
);

AudioWaveform.displayName = 'AudioWaveform';
