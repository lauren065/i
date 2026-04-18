import { useState } from 'react';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { readAdminClaims, AdminClaims } from '../../lib/auth';
import { readTracks, Track } from '../../lib/state';
import {
  PageShell,
  PageMeta,
  AppHeader,
  HeaderLink,
  headerLinkClassName,
  Heading,
  Label,
  Button,
  LinkButton,
  TextInput,
  Field,
  FieldActions,
  ProgressBar,
  TrackSection,
  AdminTrackRow,
} from '../../components';
import styles from './Admin.module.css';

type Props =
  | { authed: true; admin: AdminClaims; initialTracks: Track[] }
  | { authed: false };

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  const claims = readAdminClaims(req);
  if (!claims) return { props: { authed: false } };
  return { props: { authed: true, admin: claims, initialTracks: readTracks() } };
};

export default function Admin(props: Props) {
  if (!props.authed) return <LoginGate />;
  return <AdminDashboard admin={props.admin} initialTracks={props.initialTracks} />;
}

function LoginGate() {
  return (
    <>
      <PageMeta title="admin" description="access restricted" path="/admin" />
      <PageShell centered>
        <div className={styles.loginCard}>
          <Heading level={1}>admin</Heading>
          <span className={styles.loginSub}>access restricted</span>
          <LinkButton href="/api/auth/google" variant="primary" size="md">
            Sign in with Google
          </LinkButton>
        </div>
      </PageShell>
    </>
  );
}

function AdminDashboard({ admin, initialTracks }: { admin: AdminClaims; initialTracks: Track[] }) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', section: '', file: null as File | null });

  const refresh = async () => {
    const r = await fetch('/api/admin/tracks');
    if (r.ok) {
      const { tracks } = await r.json();
      setTracks(tracks);
    }
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.file || !form.title || !form.section) {
      setError('title, section, file 모두 필요');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('section', form.section);
      fd.append('file', form.file);
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (ev) => {
        if (ev.lengthComputable) setProgress((ev.loaded / ev.total) * 100);
      });
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`)); }
            catch { reject(new Error(`HTTP ${xhr.status}`)); }
          }
        };
        xhr.onerror = () => reject(new Error('network error'));
        xhr.open('POST', '/api/admin/upload');
        xhr.send(fd);
      });
      await refresh();
      setForm({ title: '', section: '', file: null });
      const input = document.getElementById('file-input') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteTrack = async (id: string) => {
    if (!confirm(`삭제: ${id}\n복구 불가합니다. 진행?`)) return;
    const r = await fetch(`/api/admin/tracks/${id}`, { method: 'DELETE' });
    if (r.ok) await refresh();
    else {
      const j = await r.json().catch(() => ({}));
      setError(j.error || `delete failed: HTTP ${r.status}`);
    }
  };

  const patchTrack = async (
    id: string,
    patch: Partial<{ title: string; section: string; published: boolean; activeVersionId: string }>
  ) => {
    // Optimistic update for snappy UI
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const r = await fetch('/api/admin/tracks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || `update failed: HTTP ${r.status}`);
      await refresh(); // rollback to server truth
    } else {
      // For version-affecting changes, pull fresh server state so we see new duration/active
      if ('activeVersionId' in patch) await refresh();
    }
  };

  const uploadVersion = async (trackId: string, file: File, note?: string) => {
    const fd = new FormData();
    fd.append('trackId', trackId);
    fd.append('file', file);
    if (note) fd.append('note', note);
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || `upload failed: HTTP ${r.status}`);
    }
    await refresh();
  };

  const deleteVersion = async (trackId: string, versionId: string) => {
    const r = await fetch(`/api/admin/versions/${trackId}/${versionId}`, { method: 'DELETE' });
    if (r.ok) await refresh();
    else {
      const j = await r.json().catch(() => ({}));
      setError(j.error || `version delete failed: HTTP ${r.status}`);
    }
  };

  const existingSections = Array.from(new Set(tracks.map((t) => t.section)));
  const grouped: Record<string, Track[]> = {};
  tracks.forEach((t) => { (grouped[t.section] ||= []).push(t); });

  return (
    <>
      <PageMeta title="admin" description={`${tracks.length} products`} path="/admin" />
      <PageShell width="medium">
        <AppHeader
          left={<><Label>admin</Label><span className={styles.who}>{admin.email}</span></>}
          right={<>
            <Link href="/studio" className={headerLinkClassName}>studio →</Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <HeaderLink href="/api/auth/logout">logout</HeaderLink>
          </>}
        />

        <section className={styles.upload}>
          <Heading level={2}>Upload new track</Heading>
          <form onSubmit={upload}>
            <Field label="Section">
              <TextInput
                list="sections"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="Disc 1 / Singles / …"
                disabled={uploading}
              />
              <datalist id="sections">
                {existingSections.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label="Title">
              <TextInput
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Track title"
                disabled={uploading}
              />
            </Field>
            <Field label="File">
              <TextInput
                id="file-input"
                type="file"
                accept=".mp3,.wav,.m4a,.flac,.ogg,audio/*"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                disabled={uploading}
              />
            </Field>
            <FieldActions>
              <Button type="submit" disabled={uploading}>
                {uploading ? `Uploading ${progress.toFixed(0)}%…` : 'Upload + transcode'}
              </Button>
              {error && <span className={styles.error}>{error}</span>}
            </FieldActions>
            {uploading && progress > 0 && (
              <div className={styles.progressWrap}><ProgressBar value={progress} /></div>
            )}
          </form>
          <p className={styles.hint}>
            Upload triggers ffmpeg HLS transcoding + S3 upload. Large files (50MB+) take longer.
          </p>
        </section>

        <section>
          <Heading level={2}>Tracks ({tracks.length})</Heading>
          {Object.entries(grouped).map(([section, items]) => (
            <TrackSection key={section} title={section}>
              {items.map((t) => (
                <AdminTrackRow
                  key={t.id}
                  track={t}
                  versions={t.versions}
                  activeVersionId={t.activeVersionId}
                  onTitleChange={(newTitle) => patchTrack(t.id, { title: newTitle })}
                  onTogglePublished={() => patchTrack(t.id, { published: t.published === false })}
                  onDelete={() => deleteTrack(t.id)}
                  onUploadVersion={(file, note) => uploadVersion(t.id, file, note)}
                  onSetActiveVersion={(vid) => patchTrack(t.id, { activeVersionId: vid })}
                  onDeleteVersion={(vid) => deleteVersion(t.id, vid)}
                />
              ))}
            </TrackSection>
          ))}
        </section>
      </PageShell>
    </>
  );
}
