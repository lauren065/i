import { useEffect, useRef } from 'react';
import styles from './Visualizer.module.css';

/**
 * Mini inline audio visualizer — a single glyph-sized "blob" (dough) that
 * morphs along with audio amplitude. Sits right after the title text on its
 * baseline, so its position shifts naturally with title length.
 *
 * Renders an SVG blob whose 4 control points jitter with different frequency
 * buckets, so the shape squishes and wobbles. When there's no audio source it
 * stays as a static small circle.
 */
export function Visualizer({
  active,
  analyser,
}: {
  active: boolean;
  analyser?: AnalyserNode | null;
}) {
  // We mutate a single <path> via ref to keep React renders cheap.
  const pathRef = useRef<SVGPathElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pathRef.current) return;

    // Idle (no audio / not playing): draw a small circle at minimum radius.
    if (!active || !analyser) {
      pathRef.current.setAttribute('d', circlePath(50, 50, 18));
      return;
    }

    const buf = new Uint8Array(analyser.frequencyBinCount);
    const n = analyser.frequencyBinCount;
    // Sample 4 perceptual bands from the usable (lower) third of the spectrum.
    const end = Math.floor(n * 0.33);
    const bands: Array<[number, number]> = [];
    for (let i = 0; i < 4; i++) {
      const lo = Math.floor((end * i) / 4);
      const hi = Math.floor((end * (i + 1)) / 4);
      bands.push([lo, Math.max(hi, lo + 1)]);
    }

    // Overall loudness drives common radius; per-band deltas only wobble the shape.
    // This keeps the blob from disappearing during quiet moments while still
    // squishing with each beat/transient.
    const MIN_R = 18;      // never smaller than this — blob stays clearly visible
    const MAX_R = 44;      // cap so it never clips the viewBox
    const WOBBLE = 7;      // per-axis asymmetry amplitude

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const levels: number[] = [];
      for (const [lo, hi] of bands) {
        let peak = 0;
        for (let k = lo; k < hi; k++) if (buf[k] > peak) peak = buf[k];
        let v = peak / 255;
        v = Math.pow(v, 0.55);
        levels.push(v);
      }
      const avg = (levels[0] + levels[1] + levels[2] + levels[3]) / 4;
      const common = MIN_R + avg * (MAX_R - MIN_R);

      // Visually flipped upside-down: low-freq band drives the BOTTOM bulge
      // (highs on top). Keeping the transform off the wrapper avoids GPU
      // layer issues that were freezing path updates.
      const rBottom = common + (levels[0] - avg) * WOBBLE;
      const rRight  = common + (levels[1] - avg) * WOBBLE;
      const rTop    = common + (levels[2] - avg) * WOBBLE;
      const rLeft   = common + (levels[3] - avg) * WOBBLE;
      const d = blobPath(50, 50, rTop, rRight, rBottom, rLeft);
      if (pathRef.current) pathRef.current.setAttribute('d', d);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, analyser]);

  return (
    <span className={styles.wrap} aria-hidden>
      <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path ref={pathRef} d={circlePath(50, 50, 18)} fill="currentColor" />
      </svg>
    </span>
  );
}

/** Standard 4-arc circle path using cubic Béziers. Kappa ≈ 0.5522847498. */
function circlePath(cx: number, cy: number, r: number): string {
  const k = r * 0.5522847498;
  return [
    `M ${cx} ${cy - r}`,
    `C ${cx + k} ${cy - r}, ${cx + r} ${cy - k}, ${cx + r} ${cy}`,
    `C ${cx + r} ${cy + k}, ${cx + k} ${cy + r}, ${cx} ${cy + r}`,
    `C ${cx - k} ${cy + r}, ${cx - r} ${cy + k}, ${cx - r} ${cy}`,
    `C ${cx - r} ${cy - k}, ${cx - k} ${cy - r}, ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

/**
 * Asymmetric blob: same 4-arc topology as the circle, but each cardinal radius
 * can differ. This squishes the shape into a soft, dough-like form that wobbles
 * as the radii change. Control handles use each arc's own radius for kappa.
 */
function blobPath(
  cx: number,
  cy: number,
  rT: number,
  rR: number,
  rB: number,
  rL: number,
): string {
  const K = 0.5522847498;
  const top   = { x: cx,         y: cy - rT };
  const right = { x: cx + rR,    y: cy      };
  const bot   = { x: cx,         y: cy + rB };
  const left  = { x: cx - rL,    y: cy      };

  // For each quarter-arc we use the neighboring radii for tangent lengths.
  // Top → Right quadrant
  const tR1 = { x: cx + rR * K, y: cy - rT     };
  const tR2 = { x: cx + rR,     y: cy - rT * K };
  // Right → Bottom
  const rB1 = { x: cx + rR,     y: cy + rB * K };
  const rB2 = { x: cx + rB * K, y: cy + rB     };
  // Bottom → Left
  const bL1 = { x: cx - rL * K, y: cy + rB     };
  const bL2 = { x: cx - rL,     y: cy + rB * K };
  // Left → Top
  const lT1 = { x: cx - rL,     y: cy - rT * K };
  const lT2 = { x: cx - rT * K, y: cy - rT     };

  return [
    `M ${top.x} ${top.y}`,
    `C ${tR1.x} ${tR1.y}, ${tR2.x} ${tR2.y}, ${right.x} ${right.y}`,
    `C ${rB1.x} ${rB1.y}, ${rB2.x} ${rB2.y}, ${bot.x} ${bot.y}`,
    `C ${bL1.x} ${bL1.y}, ${bL2.x} ${bL2.y}, ${left.x} ${left.y}`,
    `C ${lT1.x} ${lT1.y}, ${lT2.x} ${lT2.y}, ${top.x} ${top.y}`,
    'Z',
  ].join(' ');
}
