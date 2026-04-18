import { ReactNode, useState, useRef, useEffect } from 'react';
import styles from './TrackList.module.css';
import { Heading } from './Heading';
import { Button } from './Button';

export type TrackRef = { id: string; title: string; section: string; duration: number };

export type VersionRef = {
  id: string;
  createdAt: string;
  duration: number;
  note?: string;
};

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return '';
  const diff = Date.now() - t;
  const days = Math.floor(diff / 86400000);
  if (days < 1) {
    const hrs = Math.floor(diff / 3600000);
    return hrs < 1 ? 'just now' : `${hrs}h ago`;
  }
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
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
 *  - version badge (click to expand version panel)
 *  - delete button
 *
 * Expanded panel shows versions + "new version" uploader.
 */
export function AdminTrackRow({
  track,
  versions,
  activeVersionId,
  onTitleChange,
  onTogglePublished,
  onDelete,
  onUploadVersion,
  onSetActiveVersion,
  onDeleteVersion,
}: {
  track: TrackRef & { published?: boolean };
  versions?: VersionRef[];
  activeVersionId?: string;
  onTitleChange?: (newTitle: string) => void | Promise<void>;
  onTogglePublished?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onUploadVersion?: (file: File, note?: string) => void | Promise<void>;
  onSetActiveVersion?: (versionId: string) => void | Promise<void>;
  onDeleteVersion?: (versionId: string) => void | Promise<void>;
}) {
  const isPublished = track.published !== false;
  const versionCount = versions?.length ?? 0;
  const hasVersioning = !!onUploadVersion;
  const activeLabel = activeVersionId || (versionCount > 0 ? versions![versionCount - 1].id : null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(track.title);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(track.title); }, [track.title]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    if (next && next !== track.title) await onTitleChange?.(next);
    else setDraft(track.title);
    setEditing(false);
  };
  const cancel = () => { setDraft(track.title); setEditing(false); };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleRowClick = () => {
    if (editing) return;
    onTogglePublished?.();
  };

  return (
    <li className={`${styles.adminRowWrap} ${isPublished ? '' : styles.unpublished}`}>
      <div
        className={styles.adminRow}
        onClick={handleRowClick}
        role="button"
        aria-pressed={isPublished}
        title={isPublished ? 'click to unpublish' : 'click to publish'}
      >
        <span
          className={`${styles.pubDot} ${isPublished ? styles.pubDotOn : styles.pubDotOff}`}
          aria-hidden
        >
          {isPublished ? '●' : '○'}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            className={styles.titleInput}
            value={draft}
            onClick={stop}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
          />
        ) : (
          <span className={styles.title}>{track.title}</span>
        )}
        <span className={styles.id}>{track.id}</span>
        <span className={styles.time}>{formatTime(track.duration)}</span>
        <span className={styles.actions} onClick={stop}>
          {hasVersioning && (
            <button
              type="button"
              className={`${styles.versionBadge} ${expanded ? styles.versionBadgeOpen : ''}`}
              onClick={() => setExpanded((x) => !x)}
              title={versionCount > 0 ? `${versionCount} version${versionCount === 1 ? '' : 's'}` : 'upload new version'}
            >
              {activeLabel ?? 'v1'} {expanded ? '▴' : '▾'}
            </button>
          )}
          <Button variant="outlined" size="sm" onClick={() => setEditing(true)}>edit</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete?.()}>delete</Button>
        </span>
      </div>
      {expanded && hasVersioning && (
        <VersionPanel
          trackTitle={track.title}
          versions={versions ?? []}
          activeVersionId={activeVersionId}
          onUploadVersion={onUploadVersion!}
          onSetActive={onSetActiveVersion}
          onDelete={onDeleteVersion}
        />
      )}
    </li>
  );
}

function VersionPanel({
  trackTitle,
  versions,
  activeVersionId,
  onUploadVersion,
  onSetActive,
  onDelete,
}: {
  trackTitle: string;
  versions: VersionRef[];
  activeVersionId?: string;
  onUploadVersion: (file: File, note?: string) => void | Promise<void>;
  onSetActive?: (versionId: string) => void | Promise<void>;
  onDelete?: (versionId: string) => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doUpload = async () => {
    if (!file) { setError('choose a file'); return; }
    setError(null);
    setBusy(true);
    try {
      await onUploadVersion(file, note.trim() || undefined);
      setFile(null);
      setNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setError(e?.message || 'upload failed');
    } finally {
      setBusy(false);
    }
  };

  const effectiveActive = activeVersionId || versions[versions.length - 1]?.id;

  return (
    <div className={styles.versionPanel}>
      <div className={styles.versionUploader}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.flac,.ogg,audio/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={busy}
        />
        <input
          className={styles.versionNote}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional, e.g. final master)"
          disabled={busy}
        />
        <Button size="sm" variant="primary" onClick={doUpload} disabled={busy || !file}>
          {busy ? 'uploading…' : 'upload new version'}
        </Button>
        {error && <span className={styles.versionError}>{error}</span>}
      </div>

      <ul className={styles.versionList}>
        {versions.length === 0 && (
          <li className={styles.versionEmpty}>
            no tracked versions yet. next upload will create v1 (legacy) + v2.
          </li>
        )}
        {[...versions].reverse().map((v) => {
          const isActive = v.id === effectiveActive;
          return (
            <li key={v.id} className={`${styles.versionRow} ${isActive ? styles.versionActive : ''}`}>
              <span className={styles.versionId}>{v.id}</span>
              {isActive && <span className={styles.versionTag}>active</span>}
              <span className={styles.versionMeta}>
                {formatRelative(v.createdAt)} · {formatTime(v.duration)}
                {v.note ? ` · ${v.note}` : ''}
              </span>
              <span className={styles.versionActions}>
                {!isActive && onSetActive && (
                  <Button size="sm" variant="secondary" onClick={() => onSetActive(v.id)}>set active</Button>
                )}
                {!isActive && onDelete && versions.length > 1 && (
                  <Button size="sm" variant="danger" onClick={() => {
                    if (confirm(`"${trackTitle}" ${v.id} 삭제?\n이 버전의 S3 파일도 함께 지워집니다.`)) {
                      onDelete(v.id);
                    }
                  }}>delete</Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
