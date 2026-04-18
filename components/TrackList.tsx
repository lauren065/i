import { ReactNode, useState, useRef, useEffect } from 'react';
import styles from './TrackList.module.css';
import { Heading } from './Heading';
import { Button } from './Button';
import { Switch } from './Switch';
import { Visualizer } from './Visualizer';
import { PlayIcon, PauseIcon } from './Icons';

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

function formatAbsolute(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export function TrackSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <Heading level={3}>{title}</Heading>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

/**
 * Studio row: click to play. When this row is the playing one, a mini
 * frequency-reactive visualizer renders right after the title text —
 * its position naturally shifts with title length.
 *
 * `unpublished` — if true, row gets a left-side marker (admin preview).
 * Content stays fully legible, no opacity tricks.
 */
export function PlayableTrackRow({
  track,
  active,
  playing,
  analyser,
  unpublished,
  onClick,
}: {
  track: TrackRef;
  active: boolean;
  playing: boolean;
  analyser?: AnalyserNode | null;
  unpublished?: boolean;
  onClick: () => void;
}) {
  return (
    <li
      className={`${styles.row} ${active ? styles.active : ''} ${unpublished ? styles.unpublishedRow : ''}`}
      onClick={onClick}
    >
      <span className={styles.titleWithViz}>
        {active && playing && (
          <span className={styles.vizSlot}>
            <Visualizer active analyser={analyser} />
          </span>
        )}
        <span className={styles.title}>{track.title}</span>
      </span>
      <span className={styles.time}>{formatTime(track.duration)}</span>
    </li>
  );
}

type AdminRowTrack = TrackRef & {
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
  srcRel?: string;
};

/**
 * Admin row:
 *  - click row → expand/collapse detail panel (shows metadata, publish switch, versions)
 *  - edit button (outlined) → inline title edit
 *  - delete button (danger)
 *  - version count badge (static, derived from versions)
 *  Panel:
 *  - Switch to toggle publish
 *  - Metadata (id, created/updated, source)
 *  - Version uploader + version list
 */
export function AdminTrackRow({
  track,
  versions,
  activeVersionId,
  nowPlayingVersion,
  onTitleChange,
  onTogglePublished,
  onDelete,
  onUploadVersion,
  onSetActiveVersion,
  onDeleteVersion,
  onPlay,
}: {
  track: AdminRowTrack;
  versions?: VersionRef[];
  activeVersionId?: string;
  /** If set and matches this track's id, which version is currently playing.
   *  `'__active__'` for the row-level play (active version). */
  nowPlayingVersion?: string;
  onTitleChange?: (newTitle: string) => void | Promise<void>;
  onTogglePublished?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onUploadVersion?: (file: File, note?: string) => void | Promise<void>;
  onSetActiveVersion?: (versionId: string) => void | Promise<void>;
  onDeleteVersion?: (versionId: string) => void | Promise<void>;
  /** Play a version. `versionId === undefined` plays the active version. */
  onPlay?: (versionId?: string) => void | Promise<void>;
}) {
  const isPublished = track.published !== false;
  const versionCount = versions?.length ?? 0;
  const hasVersioning = !!onUploadVersion;

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

  return (
    <li className={`${styles.adminRowWrap} ${isPublished ? '' : styles.unpublished}`}>
      <div
        className={styles.adminRow}
        onClick={() => { if (!editing) setExpanded((x) => !x); }}
        role="button"
        aria-expanded={expanded}
        title={expanded ? 'click to collapse' : 'click to view details'}
      >
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
          {onPlay && (
            <button
              type="button"
              className={styles.playBtn}
              onClick={() => onPlay()}
              aria-label="play active version"
              title={nowPlayingVersion === '__active__' ? 'playing…' : 'play'}
            >
              {nowPlayingVersion === '__active__' ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
          {hasVersioning && versionCount > 0 && (
            <span className={styles.versionCount} title={`${versionCount} version${versionCount === 1 ? '' : 's'}`}>
              {activeVersionId ?? versions![versionCount - 1].id}
            </span>
          )}
          <Button variant="outlined" size="sm" onClick={() => setEditing(true)}>edit</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete?.()}>delete</Button>
        </span>
      </div>

      {expanded && (
        <div className={styles.detailPanel}>
          <div className={styles.detailRow}>
            <Switch
              checked={isPublished}
              onChange={() => onTogglePublished?.()}
              label={isPublished ? 'public' : 'private'}
            />
          </div>

          <dl className={styles.meta}>
            <div><dt>id</dt><dd className={styles.mono}>{track.id}</dd></div>
            <div><dt>section</dt><dd>{track.section}</dd></div>
            <div><dt>duration</dt><dd>{formatTime(track.duration)}</dd></div>
            <div><dt>created</dt><dd>{formatAbsolute(track.createdAt)}</dd></div>
            <div><dt>updated</dt><dd>{formatAbsolute(track.updatedAt)}</dd></div>
            {track.srcRel && <div><dt>source</dt><dd className={styles.mono}>{track.srcRel}</dd></div>}
          </dl>

          {hasVersioning && (
            <VersionPanel
              trackTitle={track.title}
              versions={versions ?? []}
              activeVersionId={activeVersionId}
              nowPlayingVersion={nowPlayingVersion}
              onUploadVersion={onUploadVersion!}
              onSetActive={onSetActiveVersion}
              onDelete={onDeleteVersion}
              onPlay={onPlay}
            />
          )}
        </div>
      )}
    </li>
  );
}

function VersionPanel({
  trackTitle,
  versions,
  activeVersionId,
  nowPlayingVersion,
  onUploadVersion,
  onSetActive,
  onDelete,
  onPlay,
}: {
  trackTitle: string;
  versions: VersionRef[];
  activeVersionId?: string;
  nowPlayingVersion?: string;
  onUploadVersion: (file: File, note?: string) => void | Promise<void>;
  onSetActive?: (versionId: string) => void | Promise<void>;
  onDelete?: (versionId: string) => void | Promise<void>;
  onPlay?: (versionId?: string) => void | Promise<void>;
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
    <div className={styles.versionSection}>
      <div className={styles.versionHeading}>versions</div>

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
          const isPlaying = nowPlayingVersion === v.id;
          return (
            <li key={v.id} className={`${styles.versionRow} ${isActive ? styles.versionActive : ''}`}>
              <span className={styles.versionId}>{v.id}</span>
              {isActive && <span className={styles.versionTag}>active</span>}
              <span className={styles.versionMeta}>
                {formatRelative(v.createdAt)} · {formatTime(v.duration)}
                {v.note ? ` · ${v.note}` : ''}
              </span>
              <span className={styles.versionActions}>
                {onPlay && (
                  <button
                    type="button"
                    className={styles.playBtn}
                    onClick={() => onPlay(v.id)}
                    aria-label={`play ${v.id}`}
                    title={isPlaying ? 'playing…' : `play ${v.id}`}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                )}
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
