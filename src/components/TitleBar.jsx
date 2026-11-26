import { useState } from "react";
import { Pin, X, Minimize2, Settings } from "lucide-react";
import logo from "../assets/icons/my-icon.svg";

const DRAG = { WebkitAppRegion: "drag" };
const NO_DRAG = { WebkitAppRegion: "no-drag" };

const btn = "grid h-6 w-6 place-items-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white";

export default function TitleBar({ onCard, onSettings, settingsOpen }) {
  const [pinned, setPinned] = useState(true);

  const togglePin = async () => setPinned(await window.widget.togglePin());

  return (
    <div style={DRAG} className="flex h-8 shrink-0 items-center justify-between px-3">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-zinc-400">
        <img src={logo} alt="" className="h-4 w-4" /> Rondo
      </span>
      <div style={NO_DRAG} className="flex gap-1">
        <button className={`${btn} ${pinned ? "!text-violet-400" : ""}`} onClick={togglePin} title="Toujours au premier plan" aria-pressed={pinned}>
          <Pin size={14} className={`transition-transform ${pinned ? "" : "rotate-45"}`} />
        </button>
        <button className={`${btn} ${settingsOpen ? "!text-violet-400" : ""}`} onClick={onSettings} title="Réglages" aria-label="Réglages" aria-pressed={settingsOpen}><Settings size={14} /></button>
        <button className={btn} onClick={onCard} title="Réduire en carte (la musique continue)" aria-label="Réduire en carte"><Minimize2 size={14} /></button>
        <button className={`${btn} hover:!bg-red-500/80`} onClick={() => window.widget.quit()} title="Quitter Rondo" aria-label="Quitter Rondo"><X size={14} /></button>
      </div>
    </div>
  );
}
