import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import TitleBar from "./components/TitleBar";
import Queue from "./components/Queue";
import Controls from "./components/Controls";
import MiniControls from "./components/MiniControls";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";
import { usePersistedState } from "./hooks/usePersistedState";
import { fetchTitle, parseLinks } from "./utils/youtube";
import { fetchPlaylistVideoIds } from "./utils/playlist";

const DEFAULT_VOLUME = 70;
const DRAG = { WebkitAppRegion: "drag" };
const ERROR_MESSAGES = {
  2: "Lien invalide",
  5: "Erreur du lecteur",
  100: "Vidéo introuvable",
  101: "Lecture intégrée interdite",
  150: "Lecture intégrée interdite",
  153: "Lecture intégrée refusée",
};

function App() {
  const [queue, setQueue] = usePersistedState("queue", []);
  const [index, setIndex] = usePersistedState("index", 0);
  const [volume, setVolume] = usePersistedState("volume", DEFAULT_VOLUME);
  const [mode, setMode] = usePersistedState("mode", "full");
  const [showQueue, setShowQueue] = useState(false);
  const [status, setStatus] = useState(null);
  const initialVolume = useRef(volume).current;

  const mini = mode === "mini";
  const current = queue[index];
  const canPrev = index > 0;
  const canNext = index + 1 < queue.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < queue.length ? i + 1 : i));
  }, [queue.length, setIndex]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [setIndex]);

  const player = useYouTubePlayer({
    initialVolume,
    onEnded: next,
    onError: (code) => {
      setStatus({ tone: "error", text: ERROR_MESSAGES[code] ?? `Erreur ${code}` });
      next();
    },
  });

  // Load whichever track is selected once the player exists.
  const loadedId = useRef(null);
  useEffect(() => {
    if (!player.ready || !current || loadedId.current === current.id) return;
    const firstLoad = loadedId.current === null;
    loadedId.current = current.id;
    setStatus(null);
    if (firstLoad) player.cue(current.id);
    else player.load(current.id);
  }, [player, current]);

  useEffect(() => {
    window.widget.setMode(mode);
  }, [mode]);

  // Media keys: handlers change every render, so read them through a ref.
  const mediaHandlers = useRef({});
  mediaHandlers.current = { toggle: player.toggle, next, prev };
  useEffect(() => window.widget.onMediaCommand((cmd) => mediaHandlers.current[cmd]?.()), []);

  // Accepts anything: one link, many links, a playlist URL. Returns true if it understood the text.
  const addFromText = useCallback(
    async (text) => {
      const { videoIds, playlistIds } = parseLinks(text);
      if (!videoIds.length && !playlistIds.length) return false;
      setStatus({ tone: "info", text: "Ajout en cours…" });
      try {
        const fromPlaylists = (await Promise.all(playlistIds.map(fetchPlaylistVideoIds))).flat();
        const ids = [...new Set([...videoIds, ...fromPlaylists])];
        const tracks = await Promise.all(ids.map(async (id) => ({ id, title: await fetchTitle(id) })));
        setQueue((q) => [...q, ...tracks]);
        setStatus({ tone: "ok", text: `${tracks.length} piste${tracks.length > 1 ? "s" : ""} ajoutée${tracks.length > 1 ? "s" : ""}` });
      } catch (e) {
        setStatus({ tone: "error", text: e.message });
      }
      return true;
    },
    [setQueue],
  );

  const submitInput = async (text) => {
    if (!(await addFromText(text))) setStatus({ tone: "error", text: "Aucun lien YouTube reconnu" });
  };

  // Ctrl+V anywhere in the widget, or a link dropped on it, is enough to add tracks.
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const onPaste = (e) => {
      const text = e.clipboardData.getData("text");
      if (parseLinks(text).videoIds.length + parseLinks(text).playlistIds.length === 0) return;
      e.preventDefault();
      addFromText(text);
    };
    const onDragOver = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const onDragLeave = (e) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const onDrop = (e) => {
      e.preventDefault();
      setDragging(false);
      const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      addFromText(text);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFromText]);

  // First track added to an empty queue becomes the current one.
  useEffect(() => {
    if (queue.length && !queue[index]) setIndex(0);
  }, [queue, index, setIndex]);

  const remove = (i) => {
    setQueue((q) => q.filter((_, n) => n !== i));
    setIndex((cur) => (i < cur ? cur - 1 : cur));
  };

  const clear = () => {
    player.stop();
    loadedId.current = null;
    setQueue([]);
    setIndex(0);
  };

  const changeVolume = (v) => {
    setVolume(v);
    player.setVolume(v);
  };

  // The video box stays mounted across modes so playback never restarts.
  return (
    <div
      style={mini ? DRAG : undefined}
      className={`relative flex h-screen bg-[#0f0f14] text-zinc-100 select-none ${mini ? "items-center gap-3 p-3" : "flex-col"}`}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-xl border-2 border-dashed border-violet-400 bg-violet-500/20 text-sm font-medium text-violet-200">
          Déposer le lien ici
        </div>
      )}
      {!mini && <TitleBar onMini={() => setMode("mini")} />}

      <div className={`relative shrink-0 overflow-hidden bg-black ${mini ? "aspect-video h-[60px] rounded" : "aspect-video w-full"}`}>
        <div ref={player.mountRef} className="absolute inset-0 pointer-events-none [&>iframe]:h-full [&>iframe]:w-full" />
        {!current && !mini && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Collez un lien YouTube ci-dessous
          </p>
        )}
      </div>

      <AnimatePresence>
        {showQueue && !mini && (
          <Queue
            queue={queue}
            index={index}
            onSelect={(i) => {
              setIndex(i);
              setShowQueue(false);
            }}
            onRemove={remove}
            onClear={clear}
            onClose={() => setShowQueue(false)}
          />
        )}
      </AnimatePresence>

      {mini ? (
        <MiniControls
          player={player}
          title={current?.title}
          disabled={!current}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={prev}
          onNext={next}
          onExpand={() => setMode("full")}
        />
      ) : (
        <Controls
          player={player}
          title={current?.title}
          status={status}
          volume={volume}
          onVolume={changeVolume}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={prev}
          onNext={next}
          queueOpen={showQueue}
          queueCount={queue.length}
          onToggleQueue={() => setShowQueue((s) => !s)}
          onAdd={submitInput}
          disabled={!current}
        />
      )}
    </div>
  );
}

export default App;
