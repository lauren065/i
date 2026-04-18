import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Pre-computed audio envelope used by the client-side visualizer.
 * Same shape regardless of which upload path produced it.
 *
 * `bands.{low,mid,high}[i]` = RMS level 0..1 of frame i.
 * Frame duration is `frameMs` (default 50ms → 20 samples/sec).
 */
export type Envelope = {
  frameMs: number;
  durationSec: number;
  bands: {
    low: number[];
    mid: number[];
    high: number[];
  };
};

const SAMPLE_RATE = 22050;

function runCmd(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => resolve({ code: code ?? -1, stderr: err }));
  });
}

function computeRms(pcm: Buffer, samplesPerFrame: number): number[] {
  const i16 = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const out: number[] = [];
  for (let i = 0; i < i16.length; i += samplesPerFrame) {
    const end = Math.min(i + samplesPerFrame, i16.length);
    let sumSq = 0;
    const n = end - i;
    for (let k = i; k < end; k++) {
      const v = i16[k];
      sumSq += v * v;
    }
    // Normalize RMS against max int16; square-root then clip 0..1
    const rms = Math.sqrt(sumSq / Math.max(1, n)) / 32768;
    out.push(Math.min(1, rms));
  }
  return out;
}

/**
 * Extract a 3-band RMS envelope from any audio file ffmpeg can decode
 * (mp3, wav, m4a, flac, ogg — same formats the upload pipeline accepts).
 *
 * Uses a single ffmpeg invocation with a 3-way split + biquad filters.
 * Writes three temporary PCM files, reads them, removes them. Throws on
 * any failure so callers can reject the upload atomically.
 */
export async function extractEnvelope(inputPath: string, frameMs = 50): Promise<Envelope> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`envelope: input not found: ${inputPath}`);
  }
  const samplesPerFrame = Math.max(1, Math.floor((SAMPLE_RATE * frameMs) / 1000));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-'));
  const files = {
    low: path.join(tmpDir, 'low.pcm'),
    mid: path.join(tmpDir, 'mid.pcm'),
    high: path.join(tmpDir, 'high.pcm'),
  };

  try {
    // Single-pass 3-band split → 3 raw s16le mono 22050Hz PCM files
    const filter = [
      '[0:a]aformat=sample_fmts=s16:sample_rates=22050:channel_layouts=mono,asplit=3[a1][a2][a3]',
      '[a1]lowpass=f=250[low]',
      '[a2]bandpass=f=1500:w=2[mid]',
      '[a3]highpass=f=4000[high]',
    ].join(';');

    const res = await runCmd('ffmpeg', [
      '-y', '-nostdin', '-loglevel', 'error',
      '-i', inputPath,
      '-filter_complex', filter,
      '-map', '[low]',  '-f', 's16le', '-c:a', 'pcm_s16le', files.low,
      '-map', '[mid]',  '-f', 's16le', '-c:a', 'pcm_s16le', files.mid,
      '-map', '[high]', '-f', 's16le', '-c:a', 'pcm_s16le', files.high,
    ]);
    if (res.code !== 0) {
      throw new Error(`ffmpeg envelope extraction failed (code ${res.code}): ${res.stderr.slice(0, 500)}`);
    }

    const low = computeRms(fs.readFileSync(files.low), samplesPerFrame);
    const mid = computeRms(fs.readFileSync(files.mid), samplesPerFrame);
    const high = computeRms(fs.readFileSync(files.high), samplesPerFrame);

    // Align to the shortest band (in practice they're equal, but be safe)
    const minLen = Math.min(low.length, mid.length, high.length);
    const bands = {
      low:  low.slice(0, minLen),
      mid:  mid.slice(0, minLen),
      high: high.slice(0, minLen),
    };

    if (minLen === 0) {
      throw new Error('envelope: produced zero frames (empty audio?)');
    }

    const durationSec = (minLen * frameMs) / 1000;
    return { frameMs, durationSec, bands };
  } finally {
    // Always clean temp files
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Write envelope JSON to disk, creating parent dirs as needed.
 * Throws on failure (atomic via tmp + rename).
 */
export function writeEnvelope(outPath: string, env: Envelope): void {
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = outPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(env));
  fs.renameSync(tmp, outPath);
}
