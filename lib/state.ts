import fs from 'fs';
import path from 'path';

/**
 * State directory that stores mutable product metadata + media artifacts.
 * Defaults to ./lib for local dev (bundled seed). Production server uses
 * STATE_DIR=/var/www/cheolm-state/
 */
export const STATE_DIR = process.env.STATE_DIR || path.join(process.cwd(), 'lib');

/* ─────────────────────────────────────────────────
   Product type system
   ─────────────────────────────────────────────────
   One domain, six product formats. Each product type persists to its own
   JSON file inside STATE_DIR, keyed by `id` (sectionSlug/titleSlug).

   Music keeps the legacy `tracks.json` filename for zero-migration
   compatibility with the existing production dataset. On read we inject
   the `type` field when missing; on write we persist it.
   ───────────────────────────────────────────────── */

export type ProductType = 'music' | 'letter' | 'membership' | 'file' | 'video' | 'merch';

export type ProductBase = {
  id: string;               // `{sectionSlug}/{titleSlug}`, unique per type
  type: ProductType;
  title: string;
  section: string;
  sectionSlug: string;
  titleSlug: string;
  createdAt?: string;
  updatedAt?: string;
  published?: boolean;
};

/**
 * One immutable rendering of a track. Audio is HLS under `hlsSlug`, which
 * doubles as the path suffix in both STATE_DIR (`/hls/{hlsSlug}`) and S3
 * (`studio/{hlsSlug}`). Legacy v1 uses the bare track id; new versions use
 * `{trackId}/{id}` (e.g. `disc-1/balad-piano/v2`).
 */
export type TrackVersion = {
  id: string;               // 'v1', 'v2', ...
  createdAt: string;
  duration: number;
  hlsSlug: string;          // path suffix for HLS storage
  note?: string;
  /**
   * Relative path (from STATE_DIR) to the precomputed envelope JSON for this
   * version. Upload paths that don't set this are back-compat placeholders —
   * a migration pass will fill them in. New uploads always set it.
   */
  envelopeRel?: string;
};

export type MusicProduct = ProductBase & {
  type: 'music';
  duration: number;         // seconds (mirrors active version's duration for convenience)
  srcRel?: string;          // original upload path relative to STATE_DIR
  versions?: TrackVersion[];
  activeVersionId?: string; // id from `versions`; missing/empty = legacy single-version
};

/** Resolve the HLS slug for the active rendering of a track. */
export function activeHlsSlug(track: MusicProduct): string {
  if (!track.versions || track.versions.length === 0) return track.id;
  const active = track.versions.find((v) => v.id === track.activeVersionId)
    ?? track.versions[track.versions.length - 1];
  return active.hlsSlug;
}

export type LetterProduct = ProductBase & {
  type: 'letter';
  excerpt?: string;
  bodyMarkdownPath: string; // relative to STATE_DIR, e.g. 'letters/{id}.md'
  publishedAt?: string;
  wordCount?: number;
};

export type MembershipProduct = ProductBase & {
  type: 'membership';
  priceKRW?: number;
  priceUSD?: number;
  period: 'monthly' | 'yearly' | 'once';
  description: string;
  perks: string[];
};

export type FileProduct = ProductBase & {
  type: 'file';
  priceKRW?: number;
  priceUSD?: number;
  s3Key: string;
  sizeBytes: number;
  mimeType: string;
};

export type VideoProduct = ProductBase & {
  type: 'video';
  duration: number;
};

export type MerchProduct = ProductBase & {
  type: 'merch';
  priceKRW?: number;
  priceUSD?: number;
  stock?: number;
  images: string[];
  description: string;
};

export type Product =
  | MusicProduct
  | LetterProduct
  | MembershipProduct
  | FileProduct
  | VideoProduct
  | MerchProduct;

export type ProductOfType<T extends ProductType> = Extract<Product, { type: T }>;

/** Back-compat alias. Prefer `MusicProduct` in new code. */
export type Track = MusicProduct;

/* ─────────────────────────────────────────────────
   File layout
   ───────────────────────────────────────────────── */

const PRODUCT_FILES: Record<ProductType, string> = {
  music: 'tracks.json', // legacy filename retained
  letter: 'letters.json',
  membership: 'memberships.json',
  file: 'files.json',
  video: 'videos.json',
  merch: 'merch.json',
};

export function productsJsonPath(type: ProductType): string {
  return path.join(STATE_DIR, PRODUCT_FILES[type]);
}

/** Back-compat. Prefer productsJsonPath('music'). */
export function tracksJsonPath(): string {
  return productsJsonPath('music');
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

/** Canonical envelope file path for a given HLS slug. */
export function envelopePath(hlsSlug: string): string {
  return path.join(STATE_DIR, 'envelopes', hlsSlug, 'envelope.json');
}

/** Relative-to-STATE_DIR form of the envelope path (stored in TrackVersion). */
export function envelopeRelFor(hlsSlug: string): string {
  return path.posix.join('envelopes', hlsSlug, 'envelope.json');
}

export function lettersDir(): string {
  return path.join(STATE_DIR, 'letters');
}

/* ─────────────────────────────────────────────────
   Read / write
   ───────────────────────────────────────────────── */

export function readProductsByType<T extends ProductType>(type: T): ProductOfType<T>[] {
  const p = productsJsonPath(type);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as Array<Partial<Product>>;
    // Normalize: ensure every record carries its `type` field in memory.
    return raw.map((r) => ({ ...r, type } as ProductOfType<T>));
  } catch {
    return [];
  }
}

export function writeProductsByType<T extends ProductType>(
  type: T,
  products: ProductOfType<T>[]
): void {
  const p = productsJsonPath(type);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(products, null, 2));
  fs.renameSync(tmp, p);
}

export function readAllProducts(): Product[] {
  const types: ProductType[] = ['music', 'letter', 'membership', 'file', 'video', 'merch'];
  return types.flatMap((t) => readProductsByType(t));
}

export function findProductById(id: string): Product | null {
  for (const p of readAllProducts()) if (p.id === id) return p;
  return null;
}

/* ─────────────────────────────────────────────────
   Music-specific back-compat shims
   (existing callers use these; keep working unchanged)
   ───────────────────────────────────────────────── */

export function readTracks(): MusicProduct[] {
  return readProductsByType('music');
}

export function writeTracks(tracks: MusicProduct[]): void {
  writeProductsByType('music', tracks);
}
