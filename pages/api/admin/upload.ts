import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '../../../lib/auth';
import { readTracks, writeTracks, uploadsDir, STATE_DIR } from '../../../lib/state';
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

const MAX_AUDIO_BYTES = 500 * 1024 * 1024; // 500MB per file
const ALLOWED_EXT = new Set(['.mp3', '.wav', '.m4a', '.flac', '.ogg']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Ensure uploads dir exists
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

  const title = (fields.title?.[0] || '').trim();
  const section = (fields.section?.[0] || '').trim();
  const file = files.file?.[0];

  if (!title) return res.status(400).json({ error: 'title required' });
  if (!section) return res.status(400).json({ error: 'section required' });
  if (!file) return res.status(400).json({ error: 'file required' });

  const ext = path.extname(file.originalFilename || file.newFilename).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    fs.unlinkSync(file.filepath);
    return res.status(400).json({ error: `unsupported file extension: ${ext}` });
  }

  const sectionSlug = slugify(section);
  const titleSlug = slugify(title);
  if (!sectionSlug || !titleSlug) {
    fs.unlinkSync(file.filepath);
    return res.status(400).json({ error: 'invalid title or section (slug empty)' });
  }
  const id = `${sectionSlug}/${titleSlug}`;

  // Collision check
  const tracks = readTracks();
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
      title,
      section,
      sectionSlug,
      titleSlug,
      srcRel: `uploads/${path.basename(file.filepath)}`,
      duration,
    });
    writeTracks(tracks);

    // Clean up source upload (HLS output is kept at STATE_DIR/hls)
    try {
      fs.unlinkSync(file.filepath);
    } catch {}

    return res.status(200).json({ ok: true, id, title, section, duration });
  } catch (e: any) {
    try {
      fs.unlinkSync(file.filepath);
    } catch {}
    return res.status(500).json({ error: 'pipeline failed', detail: e.message });
  }
}
