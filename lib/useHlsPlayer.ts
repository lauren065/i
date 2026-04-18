import { useEffect, useRef, useState } from 'react';

/**
 * Shared client-side HLS audio player hook.
 *
 * - Creates one HTMLAudioElement and binds hls.js instances as needed
 * - Exposes an AudioContext + AnalyserNode so the Visualizer can read
 *   live frequency data while the track plays
 * - play(key, url): start a new stream, pause/resume if key matches current
 *
 * `key` is an opaque string that identifies "what is currently playing"
 *   - studio: trackId
 *   - admin: `${trackId}#${versionId}` or `${trackId}#__active__`
 */
export type UseHlsPlayer = {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentKey: string | null;
  playing: boolean;
  progress: number;
  duration: number;
  analyser: AnalyserNode | null;
  play: (key: string, manifestUrl: string) => Promise<void>;
  stop: () => void;
  onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  onEnded: () => void;
  onPause: () => void;
  onPlay: () => void;
};

export function useHlsPlayer(): UseHlsPlayer {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<any>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (srcRef.current) { srcRef.current.disconnect(); srcRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
    };
  }, []);

  function ensureAnalyser(audio: HTMLAudioElement) {
    if (analyser && ctxRef.current) {
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      return;
    }
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AudioCtx();
    const src = ctx.createMediaElementSource(audio);
    const node = ctx.createAnalyser();
    node.fftSize = 256;
    node.smoothingTimeConstant = 0.75;
    src.connect(node);
    node.connect(ctx.destination);
    ctxRef.current = ctx;
    srcRef.current = src;
    setAnalyser(node);
  }

  const play: UseHlsPlayer['play'] = async (key, manifestUrl) => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAnalyser(audio);

    if (currentKey === key) {
      if (audio.paused) await audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const Hls = (await import('hls.js')).default;
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(manifestUrl);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play().catch(() => {}));
      hlsRef.current = hls;
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = manifestUrl;
      audio.addEventListener('loadedmetadata', () => audio.play().catch(() => {}), { once: true });
    }
    setCurrentKey(key);
  };

  const stop = () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setCurrentKey(null);
  };

  return {
    audioRef,
    currentKey,
    playing,
    progress,
    duration,
    analyser,
    play,
    stop,
    onTimeUpdate: (e) => setProgress(e.currentTarget.currentTime),
    onLoadedMetadata: (e) => setDuration(e.currentTarget.duration),
    onEnded: () => setPlaying(false),
    onPause: () => setPlaying(false),
    onPlay: () => setPlaying(true),
  };
}
