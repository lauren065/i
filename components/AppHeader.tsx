import { ReactNode, AnchorHTMLAttributes } from 'react';
import styles from './AppHeader.module.css';

export function AppHeader({
  left,
  right,
  className,
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`${styles.header} ${className || ''}`}>
      <div className={styles.left}>{left}</div>
      <div className={styles.right}>{right}</div>
    </header>
  );
}

/** Header with a single nav item (used by /studio). */
export function SimpleHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={`${styles.simple} ${className || ''}`}>{children}</header>;
}

/** Class name to apply to any link inside a header. Works for both <a> and next/link. */
export const headerLinkClassName = styles.link;

/** Convenience <a> wrapper with the header link style applied. Use for external/API links. */
export function HeaderLink({ className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} className={`${styles.link} ${className || ''}`} />;
}
