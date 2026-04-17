import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './TextInput.module.css';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, type = 'text', ...rest }, ref) {
    const isFile = type === 'file';
    return (
      <input
        ref={ref}
        type={type}
        className={`${isFile ? styles.file : styles.input} ${className || ''}`}
        {...rest}
      />
    );
  }
);
