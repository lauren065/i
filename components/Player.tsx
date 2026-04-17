import styles from './Player.module.css';
import { formatTime } from './TrackList';

export function Player({
  title,
  progress,
  duration,
}: {
  title: string;
  progress: number;
  duration: number;
}) {
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  return (
    <footer className={styles.bar}>
      <div className={styles.now}>{title}</div>
      <div className={styles.progress}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.time}>
        {formatTime(progress)} / {formatTime(duration)}
      </div>
    </footer>
  );
}
