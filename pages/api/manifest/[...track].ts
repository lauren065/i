import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { signResourcePattern, getCfBaseUrl } from '../../../lib/cf-signer';

// Guard against path traversal — only [a-z0-9-/] slugs allowed
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

  const m3u8Path = path.join(process.cwd(), 'lib', 'hls', slug, 'index.m3u8');
  let m3u8: string;
  try {
    m3u8 = fs.readFileSync(m3u8Path, 'utf-8');
  } catch {
    return res.status(404).json({ error: 'track not found' });
  }

  const cfBase = getCfBaseUrl();
  const resourcePattern = `${cfBase}/studio/${slug}/*`;
  let sigQuery: string;
  try {
    sigQuery = signResourcePattern(resourcePattern, 600);
  } catch (e: any) {
    return res.status(500).json({ error: 'signing failed', detail: e.message });
  }

  // Rewrite segment filenames → absolute signed CloudFront URLs
  const rewritten = m3u8
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.endsWith('.ts')) {
        return `${cfBase}/studio/${slug}/${trimmed}?${sigQuery}`;
      }
      return line;
    })
    .join('\n');

  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'no-store, private');
  return res.status(200).send(rewritten);
}
