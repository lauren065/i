import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { readTracks, Track } from '../lib/state';
import { useHlsPlayer } from '../lib/useHlsPlayer';
import {
  PageShell,
  PageMeta,
  SimpleHeader,
  headerLinkClassName,
  TrackSection,
  PlayableTrackRow,
  Player,
} from '../components';

const SECTION_ORDER = ['Disc 1', 'Disc 2', 'Disc 3', 'Pure WInter', 'Singles'];

export const getServerSideProps: GetServerSideProps<{ tracks: Track[] }> = async () => {
  const tracks = readTracks().filter((t) => t.published !== false);
  return { props: { tracks } };
};

export default function Studio({ tracks }: { tracks: Track[] }) {
  const player = useHlsPlayer();

  const onPlay = (id: string) => player.play(id, `/api/manifest/${id}`);

  const sections: Record<string, Track[]> = {};
  tracks.forEach((t) => { (sections[t.section] ||= []).push(t); });

  const currentTitle = tracks.find((t) => t.id === player.currentKey)?.title || '';

  return (
    <>
      <PageMeta title="studio" description={`${tracks.length} tracks. one person.`} path="/studio" />
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
                active={player.currentKey === t.id}
                playing={player.playing}
                analyser={player.analyser}
                onClick={() => onPlay(t.id)}
              />
            ))}
          </TrackSection>
        ))}
      </PageShell>

      {player.currentKey && (
        <Player title={currentTitle} progress={player.progress} duration={player.duration} />
      )}

      <audio
        ref={player.audioRef}
        onTimeUpdate={player.onTimeUpdate}
        onLoadedMetadata={player.onLoadedMetadata}
        onEnded={player.onEnded}
        onPause={player.onPause}
        onPlay={player.onPlay}
      />
    </>
  );
}
