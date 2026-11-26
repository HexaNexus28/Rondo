import { useState } from "react";
import { SkipBack, SkipForward, ListMusic, Volume2, VolumeX, Plus, Shuffle, Repeat, Repeat1, Moon, FolderOpen } from "lucide-react";
import PlayButton from "./PlayButton";
import { formatTime } from "../utils/youtube";

const STATUS_TONE = { ok: "text-emerald-400", info: "text-zinc-400", error: "text-red-400" };
const icon = "grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent";
const small = "flex h-7 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-full px-1 transition-colors hover:bg-white/10";
const REPEAT_LABEL = { off: "Répétition : désactivée", all: "Répétition : toute la file", one: "Répétition : cette piste" };

export default function Controls({
  player, title, status, volume, onVolume,
  canPrev, canNext, onPrev, onNext,
  shuffle, repeat, onShuffle, onRepeat, sleepMinutesLeft, onSleep,
  queueOpen, queueCount, onToggleQueue, onAdd, onPickFiles, disabled,
}) {
  const [input, setInput] = useState("");
  const { current, duration } = player.time;

  const submit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input);
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 px-3 pb-3 pt-2">
      <div className="flex items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={title}>
          {title ?? "Aucune piste"}
        </p>
        <button
          className={`${small} ${sleepMinutesLeft ? "text-violet-400" : "text-zinc-500"}`}
          onClick={onSleep}
          title={sleepMinutesLeft ? `Pause dans ${sleepMinutesLeft} min` : "Minuteur de sommeil"}
          aria-label={sleepMinutesLeft ? `Pause dans ${sleepMinutesLeft} minutes` : "Minuteur de sommeil"}
        >
          <Moon size={15} />
          {sleepMinutesLeft && <span className="text-[10px] tabular-nums">{sleepMinutesLeft}m</span>}
        </button>
        <button className={`${small} ${shuffle ? "text-violet-400" : "text-zinc-500"}`} onClick={onShuffle} aria-pressed={shuffle} title="Lecture aléatoire">
          <Shuffle size={15} />
        </button>
        <button className={`${small} ${repeat !== "off" ? "text-violet-400" : "text-zinc-500"}`} onClick={onRepeat} title={REPEAT_LABEL[repeat]} aria-label={REPEAT_LABEL[repeat]}>
          {repeat === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] tabular-nums text-zinc-400">
        <span className="w-8 text-right">{formatTime(current)}</span>
        <input
          type="range" min={0} max={duration || 1} step={1} value={Math.min(current, duration || 1)}
          onChange={(e) => player.seek(Number(e.target.value))}
          disabled={disabled} aria-label="Progression"
          className="h-1 flex-1 accent-violet-500"
        />
        <span className="w-8">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between">
        <button className={`${icon} relative ${queueOpen ? "bg-violet-500/20 text-violet-300" : ""}`} onClick={onToggleQueue} aria-pressed={queueOpen} title="File d'attente">
          <ListMusic size={18} />
          {queueCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[9px]">{queueCount}</span>}
        </button>
        <div className="flex items-center gap-1">
          <button className={icon} onClick={onPrev} disabled={!canPrev} aria-label="Précédent"><SkipBack size={18} fill="currentColor" /></button>
          <PlayButton playing={player.playing} onClick={player.toggle} disabled={disabled || !player.ready} />
          <button className={icon} onClick={onNext} disabled={!canNext} aria-label="Suivant"><SkipForward size={18} fill="currentColor" /></button>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <input
            type="range" min={0} max={100} value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            aria-label="Volume" className="h-1 w-14 accent-violet-500"
          />
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Collez un ou plusieurs liens, ou une playlist"
          className="min-w-0 flex-1 select-text rounded bg-white/5 px-2 py-1.5 text-xs placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button type="submit" className="grid w-9 place-items-center rounded bg-white/10 transition-colors hover:bg-violet-600" aria-label="Ajouter" title="Ajouter à la file"><Plus size={16} /></button>
        <button type="button" onClick={onPickFiles} className="grid w-9 place-items-center rounded bg-white/10 transition-colors hover:bg-violet-600" aria-label="Ajouter des fichiers audio" title="Ajouter des fichiers audio de l’ordinateur"><FolderOpen size={16} /></button>
      </form>
      {status && <p className={`-mt-1 text-[11px] ${STATUS_TONE[status.tone]}`}>{status.text}</p>}
    </div>
  );
}
