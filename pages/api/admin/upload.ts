import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '../../../lib/auth';
import { readTracks, writeTracks, uploadsDir, TrackVersion } from '../../../lib/state';
import {
  slugify,
  probeDuration,
  transcodeToHls,
  uploadHlsToS3,
} from '../../../lib/hls-pipeline';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const MAX_AUDIO_BYTES = 500 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.mp3', '.wav', '.m4a', '.flac', '.ogg']);

function nextVersionId(existing: TrackVersion[]): string {
  const nums = existing
    .map((v) => /^v(\d+)$/.exec(v.id)?.[1])
    .filter(Boolean)
    .map((s) => parseInt(s as string, 10));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `v${n}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  fs.mkdirSync(uploadsDir(), { recursive: true });

  const form = formidable({
    uploadDir: uploadsDir(),
    keepExtensions: true,
    maxFileSize: MAX_AUDIO_BYTES,
    maxFields: 10,
  });

  let fields: formidable.Fields;
  let files: formidable.Files;
  try {
    [fields, files] = await form.parse(req);
  } catch (e: any) {
    return res.status(400).json({ error: 'multipart parse failed', detail: e.message });
  }

  const trackId = (fields.trackId?.[0] || '').trim();
  const note = (fields.note?.[0] || '').trim() || undefined;
  const file = files.file?.[0];

  if (!file) return res.status(400).json({ error: 'file required' });

  /* File creation time: prefer caller-provided lastModified (browser File API),
   * fall back to filesystem mtime, then to upload-received time. */
  const uploadedAt = new Date().toISOString();
  const lmRaw = fields.fileLastModified?.[0];
  let fileCreatedAt = uploadedAt;
  if (lmRaw) {
    const ms = Number(lmRaw);
    if (Number.isFinite(ms) && ms > 0) fileCreatedAt = new Date(ms).toISOString();
  } else {
    try {
      const mtime = fs.statSync(file.filepath).mtime;
      if (mtime.getTime() > 0) fileCreatedAt = mtime.toISOString();
    } catch {}
  }
  const ext = path.extname(file.originalFilename || file.newFilename).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    fs.unlinkSync(file.filepath);
    return res.status(400).json({ error: `unsupported file extension: ${ext}` });
  }

  const tracks = readTracks();

  /* ─── Branch A: new version of an existing track ─── */
  if (trackId) {
    const idx = tracks.findIndex((t) => t.id === trackId);
    if (idx < 0) {
      fs.unlinkSync(file.filepath);
      return res.status(404).json({ error: `track not found: ${trackId}` });
    }
    const track = tracks[idx];

    try {
      const duration = await probeDuration(file.filepath);

      // Initialize versions[] on first new-version upload: legacy becomes v1.
      if (!track.versions || track.versions.length === 0) {
        track.versions = [{
          id: 'v1',
          createdAt: track.createdAt || uploadedAt,
          duration: track.duration,
          hlsSlug: track.id, // legacy root path
          note: 'legacy',
        }];
        track.activeVersionId = 'v1';
      }

      const newId = nextVersionId(track.versions);
      const hlsSlug = `${track.id}/${newId}`;

      await transcodeToHls(file.filepath, hlsSlug);
      await uploadHlsToS3(hlsSlug);

      track.versions.push({
        id: newId,
        createdAt: fileCreatedAt, // file's own timestamp, not upload time
        duration,
        hlsSlug,
        note,
      });
      track.activeVersionId = newId;
      track.duration = duration; // mirror active for convenience
      track.updatedAt = uploadedAt;

      writeTracks(tracks);
      try { fs.unlinkSync(file.filepath); } catch {}
      return res.status(200).json({
        ok: true,
        id: trackId,
        versionId: newId,
        duration,
        createdAt: fileCreatedAt,
      });
    } catch (e: any) {
      try { fs.unlinkSync(file.filepath); } catch {}
      return res.status(500).json({ error: 'pipeline failed', detail: e.message });
    }
  }

  /* ─── Branch B: brand new track ─── */
  const title = (fields.title?.[0] || '').trim();
  const section = (fields.section?.[0] || '').trim();

  if (!title) return res.status(400).json({ error: 'title required' });
  if (!section) return res.status(400).json({ error: 'section required' });

  const sectionSlug = slugify(section);
  const titleSlug = slugify(title);
  if (!sectionSlug || !titleSlug) {
    fs.unlinkSync(file.filepath);
    return res.status(400).json({ error: 'invalid title or section (slug empty)' });
  }
  const id = `${sectionSlug}/${titleSlug}`;

  if (tracks.some((t) => t.id === id)) {
    fs.unlinkSync(file.filepath);
    return res.status(409).json({ error: `track id conflict: ${id}` });
  }

  try {
    const duration = await probeDuration(file.filepath);
    await transcodeToHls(file.filepath, id);
    await uploadHlsToS3(id);

    tracks.push({
      id,
      type: 'music',
      title,
      section,
      sectionSlug,
      titleSlug,
      srcRel: `uploads/${path.basename(file.filepath)}`,
      duration,
      createdAt: fileCreatedAt, // file's own timestamp, not upload time
      updatedAt: uploadedAt,
      published: true,
    });
    writeTracks(tracks);
    try { fs.unlinkSync(file.filepath); } catch {}
    return res.status(200).json({ ok: true, id, title, section, duration, createdAt: fileCreatedAt });
  } catch (e: any) {
    try { fs.unlinkSync(file.filepath); } catch {}
    return res.status(500).json({ error: 'pipeline failed', detail: e.message });
  }
}
