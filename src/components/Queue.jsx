import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, AudioLines, Search, Trash2, TriangleAlert } from "lucide-react";
import { thumbnailUrl } from "../utils/youtube";
import ListTabs from "./ListTabs";

const normalize = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const headerBtn = "grid h-7 w-7 shrink-0 place-items-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white";

export default function Queue({ queue, index, lists, onSelect, onRemove, onClear, onClose }) {
  const [filter, setFilter] = useState("");
  const currentRef = useRef(null);

  // Keep original indexes so select/remove stay correct while filtering.
  const rows = useMemo(() => {
    const needle = normalize(filter.trim());
    return queue.map((item, i) => ({ item, i })).filter(({ item }) => !needle || normalize(item.title).includes(needle));
  }, [queue, filter]);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-x-0 bottom-0 top-8 z-20 flex flex-col bg-[#0f0f14]"
    >
      <ListTabs {...lists} />
      <div className="flex items-center gap-1 px-2 pb-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded bg-white/5 px-2 focus-within:ring-1 focus-within:ring-violet-500">
          <Search size={14} className="shrink-0 text-zinc-500" />
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Rechercher parmi ${queue.length} pistes`}
            className="min-w-0 flex-1 select-text bg-transparent py-1.5 text-xs placeholder-zinc-500 outline-none"
          />
          {filter && (
            <button type="button" onClick={() => setFilter("")} className="text-zinc-500 hover:text-white" aria-label="Effacer la recherche">
              <X size={12} />
            </button>
          )}
        </label>
        <button className={`${headerBtn} hover:!text-red-400`} onClick={onClear} disabled={!queue.length} title="Vider la file" aria-label="Vider la file">
          <Trash2 size={14} />
        </button>
        <button className={headerBtn} onClick={onClose} title="Fermer la file" aria-label="Fermer la file">
          <X size={16} />
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {rows.length === 0 && (
          <li className="p-6 text-center text-sm text-zinc-500">{queue.length ? "Aucun résultat" : "File vide"}</li>
        )}
        {rows.map(({ item, i }) => (
          <li
            key={`${item.id}-${i}`}
            ref={i === index ? currentRef : undefined}
            className={`group flex items-center gap-2 rounded p-1 ${i === index ? "bg-violet-500/20" : "hover:bg-white/5"}`}
          >
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelect(i)} title={item.unplayable ? `${item.unplayable} — cliquer pour réessayer` : undefined}>
              <img src={thumbnailUrl(item.id)} alt="" loading="lazy" className={`h-9 w-16 shrink-0 rounded object-cover ${item.unplayable ? "opacity-30 grayscale" : ""}`} />
              <span className={`truncate text-xs ${item.unplayable ? "text-zinc-500 line-through" : ""}`}>{item.title}</span>
              {item.unplayable && <TriangleAlert size={14} className="shrink-0 text-amber-400" aria-label={item.unplayable} />}
              {i === index && <AudioLines size={14} className="shrink-0 text-violet-400" />}
            </button>
            <button className="px-2 text-zinc-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100" onClick={() => onRemove(i)} aria-label="Retirer">
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
