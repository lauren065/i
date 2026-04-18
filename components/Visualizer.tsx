import { useEffect, useRef } from 'react';
import styles from './Visualizer.module.css';

/**
 * Pre-computed envelope delivered by /api/envelope/{track}. The client indexes
 * into `bands.*[frame]` using `audio.currentTime / (frameMs/1000)`.
 * This path works on every browser (including iOS Safari) because it doesn't
 * depend on MediaElementAudioSource → AnalyserNode, which iOS can't feed.
 */
export type Envelope = {
  frameMs: number;
  durationSec: number;
  bands: { low: number[]; mid: number[]; high: number[] };
};

/**
 * Mini inline audio visualizer — a single glyph-sized "blob" (dough) whose
 * three cardinal radii are driven by low/mid/high RMS envelopes at the
 * current playback position.
 *
 * `getCurrentTime` is a function so the rAF loop can pull fresh time values
 * without triggering React re-renders.
 */
export function Visualizer({
  active,
  envelope,
  getCurrentTime,
}: {
  active: boolean;
  envelope?: Envelope | null;
  getCurrentTime?: () => number;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pathRef.current) return;

    // Idle: static small circle.
    if (!active || !envelope || !getCurrentTime) {
      pathRef.current.setAttribute('d', circlePath(50, 50, 14));
      return;
    }

    const { frameMs, bands } = envelope;
    const nFrames = Math.min(bands.low.length, bands.mid.length, bands.high.length);
    if (nFrames === 0) {
      pathRef.current.setAttribute('d', circlePath(50, 50, 14));
      return;
    }
    const frameSec = frameMs / 1000;

    const tick = () => {
      const t = getCurrentTime();
      let i = Math.floor(t / frameSec);
      if (i < 0) i = 0;
      else if (i >= nFrames) i = nFrames - 1;

      // Perceptual curve — lifts quiet parts, punches loud ones.
      const lv = (x: number) => Math.pow(Math.min(1, Math.max(0, x)), 0.55);
      const low  = lv(bands.low[i]);
      const mid  = lv(bands.mid[i]);
      const high = lv(bands.high[i]);

      const base = 10;
      const maxExtra = 34;
      // Flipped upside-down: low drives bottom, high drives top.
      const rBottom = base + low  * maxExtra;
      const rRight  = base + mid  * maxExtra;
      const rTop    = base + high * maxExtra;
      const rLeft   = base + mid  * maxExtra;
      const d = blobPath(50, 50, rTop, rRight, rBottom, rLeft);
      if (pathRef.current) pathRef.current.setAttribute('d', d);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, envelope, getCurrentTime]);

  return (
    <span className={styles.wrap} aria-hidden>
      <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path ref={pathRef} d={circlePath(50, 50, 14)} fill="currentColor" />
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
 * can differ. Control handles use each arc's own radius for kappa.
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
  const top   = { x: cx,      y: cy - rT };
  const right = { x: cx + rR, y: cy      };
  const bot   = { x: cx,      y: cy + rB };
  const left  = { x: cx - rL, y: cy      };

  const tR1 = { x: cx + rR * K, y: cy - rT     };
  const tR2 = { x: cx + rR,     y: cy - rT * K };
  const rB1 = { x: cx + rR,     y: cy + rB * K };
  const rB2 = { x: cx + rB * K, y: cy + rB     };
  const bL1 = { x: cx - rL * K, y: cy + rB     };
  const bL2 = { x: cx - rL,     y: cy + rB * K };
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
