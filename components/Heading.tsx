import { ReactNode } from 'react';
import styles from './Heading.module.css';

type Level = 1 | 2 | 3;

export function Heading({ level = 1, children, className }: { level?: Level; children: ReactNode; className?: string }) {
  const Tag = (`h${level}` as unknown) as keyof JSX.IntrinsicElements;
  const lv = level === 1 ? styles.level1 : level === 2 ? styles.level2 : styles.level3;
  return <Tag className={`${styles.h} ${lv} ${className || ''}`}>{children}</Tag>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`${styles.label} ${className || ''}`}>{children}</span>;
}
