import { ReactNode } from 'react';
import styles from './TrackList.module.css';
import { Heading } from './Heading';

export type TrackRef = { id: string; title: string; section: string; duration: number };

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TrackSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <Heading level={3}>{title}</Heading>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

/** Studio-style row: click to play, indicator shows ▸ / ‖. */
export function PlayableTrackRow({
  track,
  active,
  playing,
  onClick,
}: {
  track: TrackRef;
  active: boolean;
  playing: boolean;
  onClick: () => void;
}) {
  return (
    <li className={`${styles.row} ${active ? styles.active : ''}`} onClick={onClick}>
      <span className={styles.indicator}>
        {active && playing ? '▸' : active ? '‖' : ' '}
      </span>
      <span className={styles.title}>{track.title}</span>
      <span className={styles.time}>{formatTime(track.duration)}</span>
    </li>
  );
}

/** Admin-style row: title + id + duration + actions slot. */
export function AdminTrackRow({ track, actions }: { track: TrackRef; actions?: ReactNode }) {
  return (
    <li className={styles.adminRow}>
      <span>{track.title}</span>
      <span className={styles.id}>{track.id}</span>
      <span className={styles.time}>{formatTime(track.duration)}</span>
      <span className={styles.actions}>{actions}</span>
    </li>
  );
}
