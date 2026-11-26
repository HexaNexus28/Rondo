import { useCallback, useEffect, useRef, useState } from "react";
import local from "../sources/local";

/**
 * Plays local audio files with an <audio> element. Same interface as useYouTubePlayer,
 * so the app drives either one without knowing which. Tracks are passed whole: the URL comes from the source.
 */
export function useAudioPlayer({ onEnded, onError, initialVolume }) {
  const audioRef = useRef(null);
  const callbacks = useRef({ onEnded, onError });
  callbacks.current = { onEnded, onError };

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    const audio = new Audio();
    audio.volume = initialVolume / 100;
    audioRef.current = audio;
    const sync = () => setTime({ current: audio.currentTime, duration: audio.duration || 0 });
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => callbacks.current.onEnded?.();
    // A missing source is the only error that matters here: the file moved or was deleted.
    const onFail = () => audio.src && callbacks.current.onError?.("missing");
    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("durationchange", sync);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onFail);
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("durationchange", sync);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onFail);
    };
  }, [initialVolume]);

  const cue = useCallback((track) => {
    audioRef.current.src = local.audioUrl(track);
  }, []);
  const load = useCallback((track) => {
    audioRef.current.src = local.audioUrl(track);
    audioRef.current.play().catch(() => {});
  }, []);
  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const seek = useCallback((seconds) => {
    audioRef.current.currentTime = seconds;
    setTime((t) => ({ ...t, current: seconds }));
  }, []);
  const stop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.removeAttribute("src");
    a.load();
    setTime({ current: 0, duration: 0 });
  }, []);
  const setVolume = useCallback((v) => {
    if (audioRef.current) audioRef.current.volume = v / 100;
  }, []);

  return { ready: true, playing, time, load, cue, toggle, pause, seek, stop, setVolume };
}
