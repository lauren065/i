import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outlined' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type CommonProps = { variant?: Variant; size?: Size; className?: string };

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & CommonProps>(
  function Button({ variant = 'primary', size = 'md', className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className || ''}`}
        {...rest}
      />
    );
  }
);

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps) {
  return (
    <a className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className || ''}`} {...rest} />
  );
}
