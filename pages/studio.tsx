import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { readTracks, Track } from '../lib/state';
import {
  PageShell,
  SimpleHeader,
  headerLinkClassName,
  TrackSection,
  PlayableTrackRow,
  Player,
} from '../components';

const SECTION_ORDER = ['Disc 1', 'Disc 2', 'Disc 3', 'Pure WInter', 'Singles'];

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
      } else {
        await audio.play();
      }
      return;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const manifestUrl = `/api/manifest/${id}`;
    const Hls = (await import('hls.js')).default;
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(manifestUrl);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play().catch(() => {}));
      hlsRef.current = hls;
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = manifestUrl;
      audio.addEventListener('loadedmetadata', () => audio.play().catch(() => {}), { once: true });
    }
    setCurrent(id);
  };

  const sections: Record<string, Track[]> = {};
  tracks.forEach((t) => {
    (sections[t.section] ||= []).push(t);
  });

  const currentTitle = tracks.find((t) => t.id === current)?.title || '';

  return (
    <>
      <Head>
        <title>studio · cheolm.in</title>
      </Head>
      <PageShell width="narrow">
        <SimpleHeader>
          <Link href="/" className={headerLinkClassName}>← cheolm.in</Link>
        </SimpleHeader>

        {SECTION_ORDER.filter((s) => sections[s]).map((section) => (
          <TrackSection key={section} title={section}>
            {sections[section].map((t) => (
              <PlayableTrackRow
                key={t.id}
                track={t}
                active={current === t.id}
                playing={playing}
                onClick={() => play(t.id)}
              />
            ))}
          </TrackSection>
        ))}
      </PageShell>

      {current && <Player title={currentTitle} progress={progress} duration={duration} />}

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </>
  );
}
