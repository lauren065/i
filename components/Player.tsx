import { useRef } from 'react';
import styles from './Player.module.css';
import { formatTime } from './TrackList';
import { PlayIcon, PauseIcon } from './Icons';

/**
 * Bottom-fixed play bar.
 *
 * Layout: [ ⏯  title + progress + time ]
 *
 * Progress bar is seekable: click or drag anywhere to scrub. `onSeek` is called
 * with seconds (0..duration). Keyboard: ← / → to step 5s, shift for 15s.
 */
export function Player({
  title,
  progress,
  duration,
  playing,
  onTogglePlay,
  onSeek,
}: {
  title: string;
  progress: number;
  duration: number;
  playing?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
}) {
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const seekFromClientX = (clientX: number) => {
    const el = barRef.current;
    if (!el || !onSeek || !isFinite(duration) || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek || !isFinite(duration) || duration <= 0) return;
    const step = e.shiftKey ? 15 : 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, progress - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, progress + step));
    }
  };

  return (
    <footer className={styles.bar}>
      {onTogglePlay && (
        <button
          type="button"
          className={styles.play}
          onClick={onTogglePlay}
          aria-label={playing ? 'pause' : 'play'}
          title={playing ? 'pause' : 'play'}
        >
          {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>
      )}
      <div className={styles.body}>
        <div className={styles.now}>{title}</div>
        <div
          ref={barRef}
          className={`${styles.progress} ${onSeek ? styles.seekable : ''}`}
          role="slider"
          tabIndex={onSeek ? 0 : -1}
          aria-valuemin={0}
          aria-valuemax={isFinite(duration) ? duration : 0}
          aria-valuenow={progress}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className={styles.fill} style={{ width: `${pct}%` }} />
          {onSeek && <div className={styles.handle} style={{ left: `${pct}%` }} />}
        </div>
        <div className={styles.time}>
          {formatTime(progress)} / {formatTime(duration)}
        </div>
      </div>
    </footer>
  );
}
