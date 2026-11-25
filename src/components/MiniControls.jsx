import { SkipBack, SkipForward, Maximize2, Video, RectangleHorizontal, X } from "lucide-react";
import PlayButton from "./PlayButton";

const NO_DRAG = { WebkitAppRegion: "no-drag" };
const iconBtn = "grid h-7 w-7 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent";
const smallBtn = "grid h-5 w-5 place-items-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white";

export default function MiniControls({ player, title, disabled, canPrev, canNext, onPrev, onNext, compact, onToggleFormat, onExpand }) {
  const { current, duration } = player.time;
  const progress = duration ? (current / duration) * 100 : 0;

  const formatLabel = compact ? "Afficher la vidéo" : "Format compact";

  return (
    <div className={`flex min-w-0 flex-1 flex-col justify-between gap-1.5 ${compact ? "" : "p-3"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium" title={title}>{title ?? "Aucune piste"}</p>
        <div style={NO_DRAG} className="flex shrink-0 gap-0.5">
          <button className={smallBtn} onClick={onToggleFormat} aria-label={formatLabel} title={formatLabel}>
            {compact ? <Video size={12} /> : <RectangleHorizontal size={12} />}
          </button>
          <button className={smallBtn} onClick={onExpand} aria-label="Agrandir" title="Agrandir"><Maximize2 size={12} /></button>
          <button className={`${smallBtn} hover:!bg-red-500/80`} onClick={() => window.widget.close()} aria-label="Fermer" title="Fermer"><X size={12} /></button>
        </div>
      </div>
      <div style={NO_DRAG} className="flex items-center gap-1">
        <button className={iconBtn} onClick={onPrev} disabled={!canPrev} aria-label="Précédent"><SkipBack size={15} fill="currentColor" /></button>
        <PlayButton size="sm" playing={player.playing} onClick={player.toggle} disabled={disabled || !player.ready} />
        <button className={iconBtn} onClick={onNext} disabled={!canNext} aria-label="Suivant"><SkipForward size={15} fill="currentColor" /></button>
      </div>
      <div className="h-0.5 overflow-hidden rounded bg-white/10">
        <div className="h-full bg-violet-500 transition-[width] duration-500 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
