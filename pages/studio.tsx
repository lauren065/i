import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { readTracks, Track } from '../lib/state';

const SECTION_ORDER = ['Disc 1', 'Disc 2', 'Disc 3', 'Pure WInter', 'Singles'];

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const getServerSideProps: GetServerSideProps<{ tracks: Track[] }> = async () => {
  return { props: { tracks: readTracks() } };
};

export default function Studio({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<any>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  const play = async (id: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current === id) {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
      }
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const manifestUrl = `/api/manifest/${id}`;
    // Dynamic import so SSR doesn't pull it in
    const Hls = (await import('hls.js')).default;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(manifestUrl);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch(() => {});
      });
      hlsRef.current = hls;
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      audio.src = manifestUrl;
      audio.addEventListener('loadedmetadata', () => audio.play().catch(() => {}), { once: true });
    }
    setCurrent(id);
    setPlaying(true);
  };

  const sections: Record<string, Track[]> = {};
  (tracks as Track[]).forEach((t) => {
    (sections[t.section] ||= []).push(t);
  });

  return (
    <>
      <Head>
        <title>studio · cheolm.in</title>
      </Head>
      <div className="studio">
        <header>
          <Link href="/" className="back">← cheolm.in</Link>
        </header>
        <main>
          {SECTION_ORDER.filter((s) => sections[s]).map((section) => (
            <section key={section}>
              <h2>{section}</h2>
              <ul>
                {sections[section].map((t) => {
                  const active = current === t.id;
                  return (
                    <li
                      key={t.id}
                      className={active ? 'active' : ''}
                      onClick={() => play(t.id)}
                    >
                      <span className="indicator">
                        {active && playing ? '▸' : active ? '‖' : ' '}
                      </span>
                      <span className="title">{t.title}</span>
                      <span className="time">{formatTime(t.duration)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </main>
        {current && (
          <footer className="player">
            <div className="now">
              {(tracks as Track[]).find((t) => t.id === current)?.title}
            </div>
            <div className="bar">
              <div className="fill" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
            </div>
            <div className="time">
              {formatTime(progress)} / {formatTime(duration)}
            </div>
          </footer>
        )}
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      </div>
      <style jsx>{`
        :global(body) { margin: 0; background: #000; color: #fff; }
        .studio {
          font-family: -apple-system, 'Pretendard', 'Helvetica Neue', monospace;
          min-height: 100vh;
          max-width: 640px;
          margin: 0 auto;
          padding: 40px 24px 120px;
          font-size: 13px;
          line-height: 1.6;
        }
        header { margin-bottom: 48px; }
        .back { color: #888; text-decoration: none; font-size: 11px; }
        .back:hover { color: #fff; }
        section { margin-bottom: 36px; }
        h2 {
          font-size: 10px;
          font-weight: normal;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #666;
          margin: 0 0 12px;
        }
        ul { list-style: none; padding: 0; margin: 0; }
        li {
          display: grid;
          grid-template-columns: 20px 1fr auto;
          gap: 10px;
          padding: 6px 0;
          cursor: pointer;
          color: #aaa;
          transition: color 0.15s;
          border-bottom: 1px solid #111;
        }
        li:hover { color: #fff; }
        li.active { color: #fff; }
        .indicator { text-align: center; opacity: 0.8; }
        .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .time { color: #555; font-variant-numeric: tabular-nums; }
        .player {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(0,0,0,0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid #222;
          padding: 14px 24px;
          font-size: 11px;
        }
        .now { color: #fff; margin-bottom: 6px; }
        .bar {
          height: 2px;
          background: #222;
          border-radius: 1px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .fill {
          height: 100%;
          background: #fff;
          transition: width 0.2s linear;
        }
        .player .time { color: #666; font-size: 10px; }
      `}</style>
    </>
  );
}
