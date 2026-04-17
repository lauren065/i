import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../lib/auth';
import { readTracks, writeTracks } from '../../../../lib/state';
import { deleteHlsFromS3 } from '../../../../lib/hls-pipeline';

const SLUG_RE = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const slugArr = req.query.slug;
  if (!Array.isArray(slugArr) || slugArr.length === 0) {
    return res.status(400).json({ error: 'invalid slug' });
  }
  const id = slugArr.join('/');
  if (!SLUG_RE.test(id)) return res.status(400).json({ error: 'invalid slug format' });

  if (req.method === 'DELETE') {
    const tracks = readTracks();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx < 0) return res.status(404).json({ error: 'track not found' });
    const [removed] = tracks.splice(idx, 1);
    writeTracks(tracks);
    try {
      await deleteHlsFromS3(id);
    } catch (e: any) {
      // Tracks already removed from listing; log S3 cleanup failure but don't rollback
      console.error('[admin] S3 cleanup failed for', id, e.message);
      return res.status(200).json({ ok: true, removed, s3CleanupError: e.message });
    }
    return res.status(200).json({ ok: true, removed });
  }

  res.setHeader('Allow', 'DELETE');
  return res.status(405).json({ error: 'method not allowed' });
}
