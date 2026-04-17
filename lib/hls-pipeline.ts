import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { hlsDir, STATE_DIR } from './state';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'cheolm-media';

function getS3(): S3Client {
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_WRITER_KEY_ID || '',
      secretAccessKey: process.env.AWS_WRITER_SECRET || '',
    },
  });
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', reject);
    p.on('close', (code) => resolve({ stdout: out, stderr: err, code: code ?? -1 }));
  });
}

export async function probeDuration(input: string): Promise<number> {
  const r = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    input,
  ]);
  const n = parseFloat(r.stdout.trim());
  return isFinite(n) ? n : 0;
}

/**
 * Transcode a local audio file to HLS (AAC 192kbps, 10s segments).
 * Output at {STATE_DIR}/hls/{slug}/index.m3u8 + seg_NNN.ts
 */
export async function transcodeToHls(inputPath: string, slug: string): Promise<void> {
  const outDir = hlsDir(slug);
  fs.mkdirSync(outDir, { recursive: true });
  // Clean any existing segments
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.ts') || f.endsWith('.m3u8')) fs.unlinkSync(path.join(outDir, f));
  }
  const segPattern = path.join(outDir, 'seg_%03d.ts');
  const m3u8 = path.join(outDir, 'index.m3u8');
  const r = await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-nostdin',
    '-i', inputPath,
    '-vn',
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
    '-f', 'hls',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', segPattern,
    m3u8,
  ]);
  if (r.code !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(0, 500)}`);
}

/** Upload the HLS output dir to S3 under studio/{slug}/. */
export async function uploadHlsToS3(slug: string): Promise<void> {
  const s3 = getS3();
  const dir = hlsDir(slug);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') || f.endsWith('.m3u8'));
  for (const f of files) {
    const body = fs.readFileSync(path.join(dir, f));
    const contentType = f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
    const cacheControl = f.endsWith('.ts')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=60';
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `studio/${slug}/${f}`,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    );
  }
}

/** Delete all objects under studio/{slug}/ from S3 and remove local hls dir. */
export async function deleteHlsFromS3(slug: string): Promise<void> {
  const s3 = getS3();
  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: `studio/${slug}/` })
  );
  const objects = (list.Contents || []).map((o) => ({ Key: o.Key! }));
  if (objects.length > 0) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: objects, Quiet: true },
      })
    );
  }
  // Remove local
  const dir = hlsDir(slug);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
