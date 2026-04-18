import styles from './Switch.module.css';

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`${styles.wrap} ${disabled ? styles.disabled : ''} ${className || ''}`}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
      <span className={`${styles.track} ${checked ? styles.trackOn : ''}`}>
        <span className={styles.knob} />
      </span>
      {label && <span className={`${styles.label} ${checked ? styles.labelOn : ''}`}>{label}</span>}
    </label>
  );
}
