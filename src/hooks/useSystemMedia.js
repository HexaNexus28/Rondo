import { useCallback, useEffect, useMemo, useState } from "react";

const TICK_MS = 500;

/**
 * What other apps play, as reported by Windows. Picks one session (the user's choice, else one that plays,
 * else the one Windows considers current) and exposes it with the same interface as the other players.
 */
export function useSystemMedia() {
  const [state, setState] = useState({ current: null, sessions: [] });
  const [chosenId, setChosenId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    window.widget.getSystemSessions().then(setState);
    return window.widget.onSystemSessions(setState);
  }, []);

  const { sessions } = state;
  const session =
    sessions.find((s) => s.id === chosenId) ??
    sessions.find((s) => s.status === "playing") ??
    sessions.find((s) => s.id === state.current) ??
    sessions[0] ??
    null;
  const playing = session?.status === "playing";

  // Windows reports the position only now and then: move it forward between reports.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [playing]);

  const id = session?.id;
  const command = useCallback((cmd, extra) => id && window.widget.systemCommand({ cmd, id, ...extra }), [id]);

  // Moves to the next app that exposes a session; false once past the last one (the caller goes back to Rondo).
  const chooseNext = useCallback(() => {
    const i = sessions.findIndex((s) => s.id === id);
    if (i === -1 || i === sessions.length - 1) {
      setChosenId(null);
      return false;
    }
    setChosenId(sessions[i + 1].id);
    return true;
  }, [sessions, id]);

  const player = useMemo(() => {
    const duration = session?.duration ?? 0;
    const elapsed = playing ? (now - session.updatedAt) / 1000 : 0;
    const current = Math.min(duration, Math.max(0, (session?.position ?? 0) + elapsed));
    return {
      ready: Boolean(session?.canToggle),
      playing,
      time: { current, duration },
      toggle: () => command("toggle"),
      pause: () => playing && command("pause"),
      seek: (position) => command("seek", { position }),
      load: () => {},
      cue: () => {},
      stop: () => {},
      setVolume: () => {},
    };
  }, [session, playing, now, command]);

  return { sessions, session, player, command, chooseNext };
}
