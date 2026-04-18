import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { readTracks, Track } from '../lib/state';
import { readAdminClaims } from '../lib/auth';
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

type Props = { tracks: Track[]; isAdmin: boolean };

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  const claims = readAdminClaims(req);
  const isAdmin = !!claims;
  // Admins see everything; public sees only published tracks.
  const tracks = isAdmin ? readTracks() : readTracks().filter((t) => t.published !== false);
  return { props: { tracks, isAdmin } };
};

export default function Studio({ tracks, isAdmin }: Props) {
  const player = useHlsPlayer();

  const onPlay = (id: string) =>
    player.play(id, `/api/manifest/${id}`, `/api/envelope/${id}`);

  const sections: Record<string, Track[]> = {};
  tracks.forEach((t) => { (sections[t.section] ||= []).push(t); });

  // Section ordering: known sections first, then any others (e.g. Unreleased) alphabetically
  const knownSections = SECTION_ORDER.filter((s) => sections[s]);
  const extraSections = Object.keys(sections)
    .filter((s) => !SECTION_ORDER.includes(s))
    .sort();
  const orderedSections = [...knownSections, ...extraSections];

  const currentTitle = tracks.find((t) => t.id === player.currentKey)?.title || '';

  return (
    <>
      <PageMeta title="studio" description={`${tracks.length} tracks. one person.`} path="/studio" />
      <PageShell width="narrow">
        <SimpleHeader>
          <Link href="/" className={headerLinkClassName}>← cheolm.in</Link>
        </SimpleHeader>

        {orderedSections.map((section) => (
          <TrackSection key={section} title={section}>
            {sections[section].map((t) => (
              <PlayableTrackRow
                key={t.id}
                track={t}
                active={player.currentKey === t.id}
                playing={player.playing}
                envelope={player.currentKey === t.id ? player.envelope : null}
                getCurrentTime={player.getCurrentTime}
                unpublished={t.published === false}
                onClick={() => onPlay(t.id)}
              />
            ))}
          </TrackSection>
        ))}
      </PageShell>

      {player.currentKey && (
        <Player
          title={currentTitle}
          progress={player.progress}
          duration={player.duration}
          playing={player.playing}
          onTogglePlay={player.togglePlay}
          onSeek={player.seek}
        />
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
