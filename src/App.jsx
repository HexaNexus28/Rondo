import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import TitleBar from "./components/TitleBar";
import Queue from "./components/Queue";
import Controls from "./components/Controls";
import MiniControls from "./components/MiniControls";
import Settings from "./components/Settings";
import SourceTerms from "./components/SourceTerms";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { usePersistedState } from "./hooks/usePersistedState";
import { fetchTitle, parseLinks } from "./utils/youtube";
import { fetchPlaylistVideoIds } from "./utils/playlist";
import { initialLists, newList, nextListName } from "./utils/lists";
import youtube from "./sources/youtube";
import local from "./sources/local";
import { sourceOf } from "./sources";

const DEFAULT_VOLUME = 70;
const VOLUME_STEP = 5;
const STATUS_VISIBLE_MS = 4000;
// Errors that will never go away for this video (unlike 2/5, which are transient).
const PERMANENT_ERRORS = new Set([100, 101, 150, 153, "missing"]);
const SLEEP_STEPS_MIN = [15, 30, 60];
const MS_PER_MIN = 60_000;
const SLEEP_TICK_MS = 1000;
const DRAG = { WebkitAppRegion: "drag" };
// The player takes clicks, so it must not be part of the window's drag area.
const NO_DRAG = { WebkitAppRegion: "no-drag" };
const ERROR_MESSAGES = {
  missing: "Fichier introuvable",
  2: "Lien invalide",
  5: "Erreur du lecteur",
  100: "Vidéo introuvable",
  101: "Lecture intégrée interdite",
  150: "Lecture intégrée interdite",
  153: "Lecture intégrée refusée",
};

function App() {
  const [lists, setLists] = usePersistedState("lists", initialLists);
  const [storedActiveId, setActiveId] = usePersistedState("activeList", null);
  const active = lists.find((l) => l.id === storedActiveId) ?? lists[0];
  const activeId = active.id;
  const { queue, index } = active;
  // Queue and index belong to the active list; the rest of the app keeps treating them as plain state.
  const patchList = useCallback(
    (id, key, update) =>
      setLists((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: typeof update === "function" ? update(l[key]) : update } : l))),
    [setLists],
  );
  const setQueue = useCallback((u) => patchList(activeId, "queue", u), [patchList, activeId]);
  const setIndex = useCallback((u) => patchList(activeId, "index", u), [patchList, activeId]);
  const [volume, setVolume] = usePersistedState("volume", DEFAULT_VOLUME);
  const [mode, setMode] = usePersistedState("mode", "full");
  const [miniFormat, setMiniFormat] = usePersistedState("miniFormat", "miniVideo");
  const [accent, setAccent] = usePersistedState("accent", "violet");
  const [showQueue, setShowQueue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState(null);
  const initialVolume = useRef(volume).current;

  const [shuffle, setShuffle] = usePersistedState("shuffle", false);
  const [repeat, setRepeat] = usePersistedState("repeat", "off");
  const playedInCycle = useRef(new Set());
  const shuffleHistory = useRef([]);

  const mini = mode !== "full";
  const compact = mode === "mini";
  const current = queue[index];
  const source = sourceOf(current);
  // Tracks YouTube refused to play are skipped everywhere (see onError below).
  const anyPlayable = queue.some((t) => !t.unplayable);
  const nextPlayableAfter = queue.findIndex((t, i) => i > index && !t.unplayable);
  const prevPlayableBefore = queue.findLastIndex((t, i) => i < index && !t.unplayable);
  const canPrev = shuffle ? anyPlayable : prevPlayableBefore !== -1;
  const canNext = shuffle ? anyPlayable : nextPlayableAfter !== -1 || (repeat === "all" && anyPlayable);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  // Indexes shift when the queue changes, so start a fresh shuffle cycle.
  useEffect(() => {
    playedInCycle.current = new Set();
    shuffleHistory.current = [];
  }, [queue.length, shuffle, activeId]);

  // Same video twice in a row doesn't change `current.id`, so reload it explicitly.
  const goTo = (i) => {
    if (queue[i]?.id === current?.id) player.load(current);
    else setIndex(i);
  };

  // `auto` = the track ended on its own: stop at the end of the queue unless repeating all.
  const next = (auto = false) => {
    if (!anyPlayable) return;
    if (!shuffle) {
      if (nextPlayableAfter !== -1) goTo(nextPlayableAfter);
      else if (repeat === "all") goTo(queue.findIndex((t) => !t.unplayable));
      return;
    }
    playedInCycle.current.add(index);
    const candidates = (skip) => queue.map((_, i) => i).filter((i) => !queue[i].unplayable && !skip.has(i));
    let pool = candidates(playedInCycle.current);
    if (!pool.length) {
      if (auto && repeat !== "all") return;
      playedInCycle.current = new Set([index]);
      pool = candidates(playedInCycle.current);
      if (!pool.length) pool = candidates(new Set());
    }
    shuffleHistory.current.push(index);
    goTo(pool[Math.floor(Math.random() * pool.length)]);
  };

  const prev = () => {
    if (shuffle) {
      const back = shuffleHistory.current.pop();
      if (back === undefined) player.seek(0);
      else goTo(back);
    } else if (prevPlayableBefore !== -1) goTo(prevPlayableBefore);
  };

  const cycleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  // A source's player is only used once its terms are accepted; links pasted before wait in `pendingText`.
  const [acceptedTerms, setAcceptedTerms] = usePersistedState("acceptedTerms", {});
  const [pendingText, setPendingText] = useState(null);
  const youtubeAccepted = acceptedTerms[youtube.id] === youtube.terms.version;
  const askTerms = !youtubeAccepted && (pendingText !== null || queue.some((t) => sourceOf(t) === youtube));

  const playerEvents = {
    initialVolume,
    onEnded: () => (repeat === "one" && current ? player.load(current) : next(true)),
    onError: (code) => {
      const message = ERROR_MESSAGES[code] ?? `Erreur ${code}`;
      setStatus({ tone: "error", text: `${message} — piste ignorée` });
      if (PERMANENT_ERRORS.has(code) && current) {
        setQueue((q) => q.map((t) => (t.id === current.id ? { ...t, unplayable: message } : t)));
      }
      next(true);
    },
  };
  // Each source has its own player: the one for the current track plays, the other stays silent.
  const youtubePlayer = useYouTubePlayer({ enabled: youtubeAccepted, ...playerEvents });
  const audioPlayer = useAudioPlayer(playerEvents);
  const isLocal = source === local;
  const player = isLocal ? audioPlayer : youtubePlayer;
  const { stop: stopIdle } = isLocal ? youtubePlayer : audioPlayer;
  useEffect(() => {
    stopIdle();
  }, [stopIdle]);

  // Sleep timer: off → 15 → 30 → 60 min → off. Lives here so it keeps running in mini mode.
  const [sleep, setSleep] = useState(null); // { endsAt, step }
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState(null);
  const cycleSleep = () =>
    setSleep((s) => {
      const step = s ? s.step + 1 : 0;
      return step < SLEEP_STEPS_MIN.length ? { step, endsAt: Date.now() + SLEEP_STEPS_MIN[step] * MS_PER_MIN } : null;
    });
  const { pause } = player;
  useEffect(() => {
    if (!sleep) {
      setSleepMinutesLeft(null);
      return;
    }
    const tick = () => {
      const left = sleep.endsAt - Date.now();
      if (left <= 0) {
        pause();
        setSleep(null);
      } else setSleepMinutesLeft(Math.ceil(left / MS_PER_MIN));
    };
    tick();
    const id = setInterval(tick, SLEEP_TICK_MS);
    return () => clearInterval(id);
  }, [sleep, pause]);

  // Load whichever track is selected once the player exists.
  const loadedId = useRef(null);
  useEffect(() => {
    if (!player.ready || !current || loadedId.current === current.id) return;
    const firstLoad = loadedId.current === null;
    loadedId.current = current.id;
    if (firstLoad) player.cue(current);
    else player.load(current);
  }, [player, current]);

  useEffect(() => {
    window.widget.setMode(mode);
  }, [mode]);

  // The compact bar is too small for an embedded player: only sources that play elsewhere may use it.
  const cardFormat = source.compact ? miniFormat : "miniVideo";
  useEffect(() => {
    if (mode === "mini" && !source.compact) setMode("miniVideo");
  }, [mode, source.compact, setMode]);

  const toCard = () => {
    setShowQueue(false);
    setShowSettings(false);
    setMode(cardFormat);
  };

  // Messages fade on their own; "in progress" stays until replaced by the outcome.
  useEffect(() => {
    if (!status || status.tone === "info") return;
    const id = setTimeout(() => setStatus(null), STATUS_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [status]);

  // Media keys: handlers change every render, so read them through a ref.
  const mediaHandlers = useRef({});
  mediaHandlers.current = {
    toggle: player.toggle,
    next: () => next(),
    prev,
    volumeUp: () => changeVolume(Math.min(100, volume + VOLUME_STEP)),
    volumeDown: () => changeVolume(Math.max(0, volume - VOLUME_STEP)),
    hidden: () => !source.playsHidden && player.pause(),
  };
  useEffect(() => window.widget.onMediaCommand((cmd) => mediaHandlers.current[cmd]?.()), []);

  // Accepts anything: one link, many links, a playlist URL. Returns true if it understood the text.
  const addFromText = useCallback(
    async (text, termsAccepted = youtubeAccepted) => {
      const { videoIds, playlistIds } = parseLinks(text);
      if (!videoIds.length && !playlistIds.length) return false;
      if (!termsAccepted) {
        setPendingText(text);
        return true;
      }
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
    [setQueue, youtubeAccepted],
  );

  const acceptTerms = () => {
    setAcceptedTerms((t) => ({ ...t, [youtube.id]: youtube.terms.version }));
    if (pendingText !== null) addFromText(pendingText, true);
    setPendingText(null);
  };

  // The terms need room under the player: a link dropped on the card brings the full window back.
  useEffect(() => {
    if (askTerms && mode !== "full") setMode("full");
  }, [askTerms, mode, setMode]);

  const addTracks = useCallback(
    (tracks) => {
      if (!tracks.length) return setStatus({ tone: "error", text: "Aucun fichier audio reconnu" });
      setQueue((q) => [...q, ...tracks]);
      setStatus({ tone: "ok", text: `${tracks.length} piste${tracks.length > 1 ? "s" : ""} ajoutée${tracks.length > 1 ? "s" : ""}` });
    },
    [setQueue],
  );
  const pickFiles = async () => addTracks(await window.widget.pickFiles());

  const submitInput = async (text) => {
    if (!(await addFromText(text))) setStatus({ tone: "error", text: "Aucun lien reconnu" });
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
    const onDrop = async (e) => {
      e.preventDefault();
      setDragging(false);
      const paths = [...e.dataTransfer.files].map((f) => window.widget.pathForFile(f)).filter(Boolean);
      if (paths.length) return addTracks(await window.widget.describeFiles(paths));
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
  }, [addFromText, addTracks]);

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

  const switchList = (id) => {
    if (id === activeId) return;
    setActiveId(id);
    // An empty list has no track to load, so the previous one would keep playing.
    if (!lists.find((l) => l.id === id)?.queue.length) {
      player.stop();
      loadedId.current = null;
    }
  };

  const addList = () => {
    const list = newList(nextListName(lists));
    setLists((ls) => [...ls, list]);
    switchList(list.id);
    return list.id;
  };

  const renameList = (id, name) => patchList(id, "name", name);

  const deleteList = (id) => {
    const target = lists.find((l) => l.id === id);
    if (lists.length < 2 || !window.confirm(`Supprimer « ${target.name} » et ses ${target.queue.length} pistes ?`)) return;
    const rest = lists.filter((l) => l.id !== id);
    setLists(rest);
    if (id === activeId) switchList(rest[0].id);
  };

  const changeVolume = (v) => {
    setVolume(v);
    youtubePlayer.setVolume(v);
    audioPlayer.setVolume(v);
  };

  const toggleMiniFormat = () => {
    const next = compact ? "miniVideo" : "mini";
    setMiniFormat(next);
    setMode(next);
  };

  // The video box stays mounted across modes so playback never restarts.
  return (
    <div
      style={mini ? DRAG : undefined}
      className={`relative flex h-screen bg-[#0f0f14] text-zinc-100 select-none ${compact ? "items-center gap-3 p-3" : "flex-col"}`}
    >
      {/* Kept below the player: nothing may be drawn over it. */}
      {dragging && !mini && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 top-[calc(2rem+56.25vw)] z-10 grid place-items-center rounded-xl border-2 border-dashed border-violet-400 bg-violet-500/20 text-sm font-medium text-violet-200">
          Déposer les liens ou les fichiers ici
        </div>
      )}
      {!mini && (
        <TitleBar
          onCard={toCard}
          settingsOpen={showSettings}
          onSettings={() => {
            setShowQueue(false);
            setShowSettings((s) => !s);
          }}
        />
      )}

      <div className={`relative shrink-0 overflow-hidden bg-black ${compact ? "aspect-video h-[60px] rounded" : "aspect-video w-full"}`}>
        {/* Hidden (never covered) while a local file plays: the YouTube player is stopped then. */}
        <div ref={youtubePlayer.mountRef} style={NO_DRAG} className={`absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full ${isLocal ? "invisible" : ""}`} />
        {isLocal && (
          <img key={current.id} src={local.thumbnail(current)} alt="" className="absolute inset-0 h-full w-full object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
        )}
        {!current && !mini && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Collez un lien ci-dessous
          </p>
        )}
      </div>

      <AnimatePresence>
        {showQueue && !mini && (
          <Queue
            queue={queue}
            index={index}
            lists={{ lists, activeId, onSwitch: switchList, onAdd: addList, onRename: renameList, onDelete: deleteList }}
            onSelect={(i) => {
              // Picking a skipped track is an explicit retry.
              setQueue((q) => q.map((t, n) => (n === i && t.unplayable ? { ...t, unplayable: null } : t)));
              goTo(i);
              setShowQueue(false);
            }}
            onRemove={remove}
            onClear={clear}
            onClose={() => setShowQueue(false)}
          />
        )}
      </AnimatePresence>

      {askTerms && !mini && <SourceTerms source={youtube} onAccept={acceptTerms} onCancel={pendingText !== null && !queue.length ? () => setPendingText(null) : undefined} />}

      <AnimatePresence>
        {showSettings && !mini && <Settings accent={accent} onAccent={setAccent} onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      {mini ? (
        <MiniControls
          player={player}
          title={current?.title}
          disabled={!current}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={prev}
          onNext={() => next()}
          compact={compact}
          onToggleFormat={source.compact ? toggleMiniFormat : undefined}
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
          onNext={() => next()}
          shuffle={shuffle}
          repeat={repeat}
          onShuffle={() => setShuffle((s) => !s)}
          onRepeat={cycleRepeat}
          sleepMinutesLeft={sleepMinutesLeft}
          onSleep={cycleSleep}
          queueOpen={showQueue}
          queueCount={queue.length}
          onToggleQueue={() => {
            setShowSettings(false);
            setShowQueue((s) => !s);
          }}
          onAdd={submitInput}
          onPickFiles={pickFiles}
          disabled={!current}
        />
      )}
    </div>
  );
}

export default App;
