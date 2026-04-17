import styles from './ProgressBar.module.css';

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
