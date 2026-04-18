import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import {
  readTracks,
  activeHlsSlug,
  envelopePath,
} from '../../../lib/state';
import { readAdminClaims } from '../../../lib/auth';

// Only [a-z0-9-/] slugs allowed, same as manifest.
const SLUG_RE = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const track = req.query.track;
  if (!Array.isArray(track) || track.length === 0) {
    return res.status(400).json({ error: 'invalid track' });
  }
  const slug = track.join('/');
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'invalid slug format' });
  }

  const meta = readTracks().find((t) => t.id === slug);
  const isAdmin = !!readAdminClaims(req);

  if (meta && meta.published === false && !isAdmin) {
    return res.status(404).json({ error: 'track not found' });
  }

  // Admin-only version override, mirroring /api/manifest.
  const versionParam = typeof req.query.version === 'string' ? req.query.version : undefined;
  let effectiveSlug: string;
  if (versionParam && isAdmin && meta) {
    const v = meta.versions?.find((x) => x.id === versionParam);
    if (!v) return res.status(404).json({ error: `version not found: ${versionParam}` });
    effectiveSlug = v.hlsSlug;
  } else {
    effectiveSlug = meta ? activeHlsSlug(meta) : slug;
  }

  const p = envelopePath(effectiveSlug);
  if (!fs.existsSync(p)) {
    return res.status(404).json({ error: 'envelope not available' });
  }

  const body = fs.readFileSync(p);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.status(200).send(body);
}
