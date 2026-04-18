import { ReactNode, useState, useRef, useEffect } from 'react';
import styles from './TrackList.module.css';
import { Heading } from './Heading';
import { Button } from './Button';

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

/**
 * Admin-style row:
 *  - publish indicator (● public / ○ private), click to toggle
 *  - title (click to edit inline, Enter to save, Esc to cancel)
 *  - id (muted) + duration
 *  - delete button
 */
export function AdminTrackRow({
  track,
  onTitleChange,
  onTogglePublished,
  onDelete,
}: {
  track: TrackRef & { published?: boolean };
  onTitleChange?: (newTitle: string) => void | Promise<void>;
  onTogglePublished?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const isPublished = track.published !== false;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(track.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(track.title); }, [track.title]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    if (next && next !== track.title) {
      await onTitleChange?.(next);
    } else {
      setDraft(track.title);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(track.title);
    setEditing(false);
  };

  return (
    <li className={`${styles.adminRow} ${isPublished ? '' : styles.unpublished}`}>
      <button
        type="button"
        className={`${styles.pubDot} ${isPublished ? styles.pubDotOn : styles.pubDotOff}`}
        onClick={() => onTogglePublished?.()}
        aria-label={isPublished ? '공개 → 비공개 전환' : '비공개 → 공개 전환'}
        title={isPublished ? 'public (click to hide)' : 'private (click to publish)'}
      >
        {isPublished ? '●' : '○'}
      </button>
      {editing ? (
        <input
          ref={inputRef}
          className={styles.titleInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
        />
      ) : (
        <span
          className={styles.titleEditable}
          onClick={() => setEditing(true)}
          title="click to edit"
        >
          {track.title}
        </span>
      )}
      <span className={styles.id}>{track.id}</span>
      <span className={styles.time}>{formatTime(track.duration)}</span>
      <span className={styles.actions}>
        <Button variant="danger" size="sm" onClick={() => onDelete?.()}>delete</Button>
      </span>
    </li>
  );
}
