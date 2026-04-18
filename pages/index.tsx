import { useRef, useState } from 'react';
import { PageShell, PageMeta, BlinkImage } from '../components';

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/this summer.wav');
    }
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
      });
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <PageMeta title="i" description="i · a studio under a domain." path="/" />
      <PageShell centered>
        <BlinkImage src="/assets/2025.png" alt="i" width={30} flash={flash} onClick={handleClick} />
      </PageShell>
    </>
  );
}
