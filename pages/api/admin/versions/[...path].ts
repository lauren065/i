import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { requireAdmin } from '../../../../lib/auth';
import { readTracks, writeTracks, hlsDir } from '../../../../lib/state';

// Last path segment = versionId. Everything before = trackId (e.g. ['disc-1','balad-piano','v2'])
const SEG_RE = /^[a-z0-9][a-z0-9-]*$/;

function parsePath(raw: string[] | string | undefined): { trackId: string; versionId: string } | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const versionId = raw[raw.length - 1];
  const trackId = raw.slice(0, -1).join('/');
  if (!raw.every((s) => SEG_RE.test(s))) return null;
  return { trackId, versionId };
}

async function deleteS3Prefix(prefix: string): Promise<void> {
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_WRITER_KEY_ID || '',
      secretAccessKey: process.env.AWS_WRITER_SECRET || '',
    },
  });
  const bucket = process.env.S3_BUCKET || 'cheolm-media';
  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  const keys = (list.Contents || []).map((o) => ({ Key: o.Key! }));
  if (keys.length === 0) return;
  await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const parsed = parsePath(req.query.path as string[] | undefined);
  if (!parsed) return res.status(400).json({ error: 'invalid path' });
  const { trackId, versionId } = parsed;

  const tracks = readTracks();
  const idx = tracks.findIndex((t) => t.id === trackId);
  if (idx < 0) return res.status(404).json({ error: 'track not found' });

  const track = tracks[idx];
  if (!track.versions || track.versions.length === 0) {
    return res.status(400).json({ error: 'track has no tracked versions (legacy single-rendering track)' });
  }
  const vIdx = track.versions.findIndex((v) => v.id === versionId);
  if (vIdx < 0) return res.status(404).json({ error: 'version not found' });

  // Guard: cannot delete the only remaining version
  if (track.versions.length === 1) {
    return res.status(400).json({ error: 'cannot delete the only version of a track; delete the track instead' });
  }
  // Guard: cannot delete the active version while others exist (must switch first)
  if (track.activeVersionId === versionId) {
    return res.status(400).json({ error: 'cannot delete active version; set another version active first' });
  }

  const version = track.versions[vIdx];

  // Remove S3 objects under this version's prefix
  try {
    await deleteS3Prefix(`studio/${version.hlsSlug}/`);
  } catch (e: any) {
    return res.status(500).json({ error: 'S3 cleanup failed', detail: e.message });
  }

  // Remove local hls dir (only if under a version subdir — never nuke the legacy root path)
  const localDir = hlsDir(version.hlsSlug);
  if (version.hlsSlug !== trackId && fs.existsSync(localDir)) {
    fs.rmSync(localDir, { recursive: true, force: true });
  }

  track.versions.splice(vIdx, 1);
  track.updatedAt = new Date().toISOString();
  writeTracks(tracks);
  return res.status(200).json({ ok: true, removed: version, remaining: track.versions.length });
}
