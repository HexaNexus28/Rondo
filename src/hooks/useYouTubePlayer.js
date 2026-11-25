import { useCallback, useEffect, useRef, useState } from "react";
import { loadYouTubeApi } from "../utils/youtubeApi";

const POLL_MS = 500;
const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 };

/**
 * Wraps the YouTube IFrame API. `onEnded` / `onError` are read through refs,
 * so callers can pass fresh closures without recreating the player.
 */
export function useYouTubePlayer({ onEnded, onError, initialVolume }) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const callbacks = useRef({ onEnded, onError });
  callbacks.current = { onEnded, onError };

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    let cancelled = false;
    // YT replaces the target node with an iframe, so give it a disposable child.
    const target = document.createElement("div");
    mountRef.current.append(target);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(target, {
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: { origin: window.location.origin, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: (e) => {
            e.target.setVolume(initialVolume);
            setReady(true);
          },
          onStateChange: (e) => {
            setPlaying(e.data === STATE.PLAYING);
            if (e.data === STATE.ENDED) callbacks.current.onEnded?.();
          },
          onError: (e) => callbacks.current.onError?.(e.data),
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      target.remove();
      setReady(false);
    };
  }, [initialVolume]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p) setTime({ current: p.getCurrentTime(), duration: p.getDuration() });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [ready]);

  const load = useCallback((videoId) => playerRef.current?.loadVideoById(videoId), []);
  const cue = useCallback((videoId) => playerRef.current?.cueVideoById(videoId), []);
  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === STATE.PLAYING) p.pauseVideo();
    else p.playVideo();
  }, []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const seek = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, true);
    setTime((t) => ({ ...t, current: seconds }));
  }, []);
  const stop = useCallback(() => playerRef.current?.stopVideo(), []);
  const setVolume = useCallback((v) => playerRef.current?.setVolume(v), []);

  return { mountRef, ready, playing, time, load, cue, toggle, pause, seek, stop, setVolume };
}
