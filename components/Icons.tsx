import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function PlayIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
      focusable="false"
      {...rest}
    >
      <path d="M3 1.5 L10 6 L3 10.5 Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
      focusable="false"
      {...rest}
    >
      <rect x="3" y="2" width="2.2" height="8" fill="currentColor" />
      <rect x="6.8" y="2" width="2.2" height="8" fill="currentColor" />
    </svg>
  );
}
