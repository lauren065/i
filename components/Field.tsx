import { ReactNode } from 'react';
import styles from './Field.module.css';

export function Field({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.control}>{children}</div>
    </div>
  );
}

export function FieldActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
