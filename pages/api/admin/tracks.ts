import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/auth';
import { readTracks, writeTracks } from '../../../lib/state';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({ tracks: readTracks() });
  }

  if (req.method === 'PUT') {
    // Update metadata for a single track by id
    const { id, title, section } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const tracks = readTracks();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx < 0) return res.status(404).json({ error: 'track not found' });
    if (typeof title === 'string' && title.trim()) tracks[idx].title = title.trim();
    if (typeof section === 'string' && section.trim()) tracks[idx].section = section.trim();
    writeTracks(tracks);
    return res.status(200).json({ ok: true, track: tracks[idx] });
  }

  if (req.method === 'PATCH') {
    // Reorder — accepts { order: string[] } of track IDs in desired order
    const order = req.body?.order;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
    const tracks = readTracks();
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const reordered = order.map((id: string) => byId.get(id)).filter(Boolean) as typeof tracks;
    // Append any not in the order (shouldn't happen, but don't lose data)
    for (const t of tracks) if (!order.includes(t.id)) reordered.push(t);
    writeTracks(reordered);
    return res.status(200).json({ ok: true, count: reordered.length });
  }

  res.setHeader('Allow', 'GET, PUT, PATCH');
  return res.status(405).json({ error: 'method not allowed' });
}
