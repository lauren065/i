import { useEffect, useRef, useState, useCallback } from 'react';
import type { Envelope } from '../components/Visualizer';

/**
 * Shared client-side HLS audio player hook.
 *
 * - Creates one HTMLAudioElement and binds hls.js as needed
 * - Fetches the precomputed envelope for the active stream so the visualizer
 *   works everywhere (desktop + iOS Safari). We do NOT use MediaElementAudioSource/
 *   AnalyserNode any more — iOS hands HLS off to native audio pipeline and the
 *   WebAudio graph sees zero samples.
 * - play(key, manifestUrl, envelopeUrl?): start/resume/toggle stream
 *
 * `key` is an opaque string identifying what is currently playing
 *   - studio: trackId
 *   - admin:  `${trackId}#${versionId}` or `${trackId}#__active__`
 */
export type UseHlsPlayer = {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentKey: string | null;
  playing: boolean;
  progress: number;
  duration: number;
  envelope: Envelope | null;
  getCurrentTime: () => number;
  play: (key: string, manifestUrl: string, envelopeUrl?: string) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
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

  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);

  // Serialize envelope fetches against the latest play() call so a late
  // response for a previous track can't overwrite the current one.
  const envelopeReqIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, []);

  const play: UseHlsPlayer['play'] = async (key, manifestUrl, envelopeUrl) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentKey === key) {
      if (audio.paused) await audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setEnvelope(null); // clear stale envelope while loading

    // Kick off envelope fetch in parallel with audio attach.
    const reqId = ++envelopeReqIdRef.current;
    if (envelopeUrl) {
      fetch(envelopeUrl, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((env: Envelope | null) => {
          if (envelopeReqIdRef.current === reqId) setEnvelope(env);
        })
        .catch(() => { /* visualizer just idles */ });
    }

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

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(seconds)) return;
    audio.currentTime = Math.max(0, seconds);
    setProgress(audio.currentTime);
  };

  const getCurrentTime = useCallback(() => {
    const audio = audioRef.current;
    return audio ? audio.currentTime : 0;
  }, []);

  return {
    audioRef,
    currentKey,
    playing,
    progress,
    duration,
    envelope,
    getCurrentTime,
    play,
    togglePlay,
    seek,
    stop,
    onTimeUpdate: (e) => setProgress(e.currentTarget.currentTime),
    onLoadedMetadata: (e) => setDuration(e.currentTarget.duration),
    onEnded: () => setPlaying(false),
    onPause: () => setPlaying(false),
    onPlay: () => setPlaying(true),
  };
}
