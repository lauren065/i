import fs from 'fs';
import path from 'path';

/**
 * State directory that stores mutable track metadata + m3u8 files.
 * Defaults to ./lib for local dev (bundled seed). On production server,
 * set STATE_DIR=/var/www/cheolm-state/ to decouple from the repo.
 */
export const STATE_DIR = process.env.STATE_DIR || path.join(process.cwd(), 'lib');

export function tracksJsonPath(): string {
  return path.join(STATE_DIR, 'tracks.json');
}

export function hlsPath(slug: string): string {
  return path.join(STATE_DIR, 'hls', slug, 'index.m3u8');
}

export function hlsDir(slug: string): string {
  return path.join(STATE_DIR, 'hls', slug);
}

export function uploadsDir(): string {
  return path.join(STATE_DIR, 'uploads');
}

export type Track = {
  id: string;
  title: string;
  section: string;
  sectionSlug: string;
  titleSlug: string;
  srcRel?: string;
  duration: number;
};

export function readTracks(): Track[] {
  try {
    return JSON.parse(fs.readFileSync(tracksJsonPath(), 'utf-8'));
  } catch {
    return [];
  }
}

export function writeTracks(tracks: Track[]): void {
  const tmp = tracksJsonPath() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(tracks, null, 2));
  fs.renameSync(tmp, tracksJsonPath());
}
