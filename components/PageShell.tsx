import { ReactNode } from 'react';
import styles from './PageShell.module.css';

type Width = 'narrow' | 'medium' | 'full';

export function PageShell({
  children,
  width = 'medium',
  centered = false,
  className,
}: {
  children: ReactNode;
  width?: Width;
  centered?: boolean;
  className?: string;
}) {
  const inner = centered
    ? <div className={styles.centered}>{children}</div>
    : <div className={`${styles.container} ${styles[width]}`}>{children}</div>;
  return <div className={`${styles.shell} ${className || ''}`}>{inner}</div>;
}
