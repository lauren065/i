import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { readAdminClaims, AdminClaims } from '../../lib/auth';
import { readTracks, Track } from '../../lib/state';

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
      <Head>
        <title>admin · cheolm.in</title>
      </Head>
      <div className="login">
        <h1>admin</h1>
        <p>access restricted</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/google" className="btn">Sign in with Google</a>
      </div>
      <style jsx>{`
        :global(body) { margin: 0; background: #0a0a0a; color: #fff; }
        .login {
          font-family: -apple-system, monospace;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        h1 { font-size: 13px; font-weight: normal; letter-spacing: 3px; text-transform: uppercase; margin: 0; }
        p { font-size: 11px; color: #666; margin: 0; }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #fff;
          color: #000;
          text-decoration: none;
          font-size: 12px;
          border-radius: 2px;
          margin-top: 8px;
        }
        .btn:hover { background: #eee; }
      `}</style>
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
            try {
              reject(new Error(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('network error'));
        xhr.open('POST', '/api/admin/upload');
        xhr.send(fd);
      });
      await refresh();
      setForm({ title: '', section: '', file: null });
      (document.getElementById('file-input') as HTMLInputElement).value = '';
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

  const editTrack = async (id: string) => {
    const t = tracks.find((x) => x.id === id);
    if (!t) return;
    const title = prompt('제목', t.title);
    if (title === null || title.trim() === '' || title === t.title) return;
    const r = await fetch('/api/admin/tracks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: title.trim() }),
    });
    if (r.ok) await refresh();
    else {
      const j = await r.json().catch(() => ({}));
      setError(j.error || `update failed: HTTP ${r.status}`);
    }
  };

  const existingSections = Array.from(new Set(tracks.map((t) => t.section)));

  // Group for display
  const grouped: Record<string, Track[]> = {};
  tracks.forEach((t) => {
    (grouped[t.section] ||= []).push(t);
  });

  return (
    <>
      <Head>
        <title>admin · cheolm.in</title>
      </Head>
      <div className="admin">
        <header>
          <div>
            <span className="label">admin</span>
            <span className="who">{admin.email}</span>
          </div>
          <div className="nav">
            <Link href="/studio" className="link">studio →</Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/auth/logout" className="link">logout</a>
          </div>
        </header>

        <section className="upload">
          <h2>Upload new track</h2>
          <form onSubmit={upload}>
            <div className="row">
              <label>Section</label>
              <input
                list="sections"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="Disc 1 / Singles / …"
                disabled={uploading}
              />
              <datalist id="sections">
                {existingSections.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="row">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Track title"
                disabled={uploading}
              />
            </div>
            <div className="row">
              <label>File</label>
              <input
                id="file-input"
                type="file"
                accept=".mp3,.wav,.m4a,.flac,.ogg,audio/*"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                disabled={uploading}
              />
            </div>
            <div className="row">
              <button type="submit" disabled={uploading}>
                {uploading ? `Uploading ${progress.toFixed(0)}%…` : 'Upload + transcode'}
              </button>
              {error && <span className="error">{error}</span>}
            </div>
            {uploading && progress > 0 && (
              <div className="progress"><div className="bar" style={{ width: `${progress}%` }} /></div>
            )}
          </form>
          <p className="hint">Upload triggers ffmpeg HLS transcoding + S3 upload. Large files (50MB+) take longer.</p>
        </section>

        <section className="list">
          <h2>Tracks ({tracks.length})</h2>
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} className="section">
              <h3>{section}</h3>
              <ul>
                {items.map((t) => (
                  <li key={t.id}>
                    <span className="title">{t.title}</span>
                    <span className="id">{t.id}</span>
                    <span className="dur">{Math.floor(t.duration / 60)}:{String(Math.floor(t.duration % 60)).padStart(2, '0')}</span>
                    <span className="actions">
                      <button onClick={() => editTrack(t.id)}>edit</button>
                      <button onClick={() => deleteTrack(t.id)} className="danger">delete</button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
      <style jsx>{`
        :global(body) { margin: 0; background: #0a0a0a; color: #fff; }
        .admin {
          font-family: -apple-system, 'Helvetica Neue', monospace;
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 24px 80px;
          font-size: 13px;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #222;
          margin-bottom: 30px;
        }
        .label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #fff; margin-right: 16px; }
        .who { font-size: 11px; color: #888; }
        .nav { display: flex; gap: 16px; }
        .link { color: #888; text-decoration: none; font-size: 11px; }
        .link:hover { color: #fff; }

        h2 { font-size: 11px; font-weight: normal; letter-spacing: 2px; text-transform: uppercase; color: #888; margin: 0 0 12px; }
        h3 { font-size: 10px; font-weight: normal; letter-spacing: 2px; text-transform: uppercase; color: #555; margin: 18px 0 8px; }

        .upload { margin-bottom: 40px; padding: 18px; background: #141414; border: 1px solid #222; border-radius: 4px; }
        .row { display: flex; align-items: center; margin-bottom: 10px; gap: 10px; }
        .row label { width: 80px; color: #888; font-size: 11px; flex-shrink: 0; }
        .row input[type=text], .row input:not([type]) {
          flex: 1;
          background: #000;
          border: 1px solid #333;
          padding: 8px 10px;
          color: #fff;
          font-size: 12px;
          border-radius: 2px;
          font-family: inherit;
        }
        .row input[type=file] { color: #aaa; font-size: 11px; }
        button {
          background: #fff;
          color: #000;
          border: none;
          padding: 8px 14px;
          font-size: 11px;
          cursor: pointer;
          border-radius: 2px;
          font-family: inherit;
        }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        button.danger { background: #3a0f0f; color: #ff9090; }
        button.danger:hover { background: #5a1515; }
        .error { color: #ff7070; font-size: 11px; margin-left: 12px; }
        .progress { height: 2px; background: #222; margin-top: 6px; border-radius: 1px; overflow: hidden; }
        .progress .bar { height: 100%; background: #fff; transition: width 0.2s; }
        .hint { color: #555; font-size: 10px; margin-top: 8px; }

        .list ul { list-style: none; padding: 0; margin: 0; }
        .list li {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 14px;
          align-items: center;
          padding: 8px 10px;
          border-bottom: 1px solid #161616;
          font-size: 12px;
        }
        .list .title { color: #fff; }
        .list .id { color: #555; font-size: 10px; font-family: monospace; }
        .list .dur { color: #666; font-size: 11px; font-variant-numeric: tabular-nums; min-width: 40px; text-align: right; }
        .list .actions { display: flex; gap: 6px; }
        .list .actions button { padding: 4px 8px; font-size: 10px; background: #222; color: #ccc; }
        .list .actions button:hover { background: #333; color: #fff; }
      `}</style>
    </>
  );
}
