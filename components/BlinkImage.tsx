import styles from './BlinkImage.module.css';

export function BlinkImage({
  src,
  alt,
  width = 30,
  flash = false,
  onClick,
}: {
  src: string;
  alt: string;
  width?: number;
  flash?: boolean;
  onClick?: () => void;
}) {
  return (
    <span onClick={onClick} className={`${styles.span} ${flash ? styles.flash : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} />
    </span>
  );
}
