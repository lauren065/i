import { useEffect, useRef, useState } from 'react';
import styles from './Visualizer.module.css';

/**
 * Mini inline audio visualizer — fits on the text baseline.
 * Reads from a shared AnalyserNode in the page's audio graph.
 * Samples 5 frequency buckets for compact bars (like "|||||" flowing with sound).
 *
 * `active` — whether this instance is the one currently producing sound.
 *            When false, bars collapse to min height (no animation).
 * `analyser` — shared WebAudio AnalyserNode. If undefined/null, renders static collapsed bars.
 */
export function Visualizer({
  active,
  analyser,
  bars = 5,
}: {
  active: boolean;
  analyser?: AnalyserNode | null;
  bars?: number;
}) {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !analyser) {
      setLevels(Array(bars).fill(0));
      return;
    }
    const buf = new Uint8Array(analyser.frequencyBinCount);
    // Pick bucket ranges spanning a perceptual range (log-ish within first ~1/3 of spectrum)
    const n = analyser.frequencyBinCount;
    const end = Math.floor(n * 0.33);
    const ranges: Array<[number, number]> = [];
    for (let i = 0; i < bars; i++) {
      const lo = Math.floor((end * i) / bars);
      const hi = Math.floor((end * (i + 1)) / bars);
      ranges.push([lo, Math.max(hi, lo + 1)]);
    }

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const out: number[] = [];
      for (const [lo, hi] of ranges) {
        let sum = 0;
        for (let k = lo; k < hi; k++) sum += buf[k];
        out.push(sum / (hi - lo) / 255); // normalize 0..1
      }
      setLevels(out);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, analyser, bars]);

  return (
    <span className={styles.wrap} aria-hidden>
      {levels.map((l, i) => (
        <span
          key={i}
          className={styles.bar}
          style={{ height: `${Math.max(10, Math.round(l * 100))}%` }}
        />
      ))}
    </span>
  );
}
