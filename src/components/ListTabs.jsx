import { useState } from "react";
import { Plus, X } from "lucide-react";

const chip = "shrink-0 rounded px-2 py-1 text-xs transition-colors";

export default function ListTabs({ lists, activeId, onSwitch, onAdd, onRename, onDelete }) {
  const [editingId, setEditingId] = useState(null);

  const commit = (id, value) => {
    const name = value.trim();
    if (name) onRename(id, name);
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-2 pb-2">
      {lists.map((l) =>
        editingId === l.id ? (
          <input
            key={l.id}
            autoFocus
            defaultValue={l.name}
            maxLength={30}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => commit(l.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(l.id, e.target.value);
              if (e.key === "Escape") setEditingId(null);
            }}
            className={`${chip} w-28 select-text bg-white/10 outline-none ring-1 ring-violet-500`}
          />
        ) : (
          <div key={l.id} className={`group flex shrink-0 items-center rounded ${l.id === activeId ? "bg-violet-500/20 text-white" : "text-zinc-400 hover:bg-white/5"}`}>
            <button
              className={`${chip} max-w-[8rem] truncate`}
              onClick={() => onSwitch(l.id)}
              onDoubleClick={() => setEditingId(l.id)}
              title={`${l.name} (${l.queue.length}) — double-clic pour renommer`}
            >
              {l.name}
            </button>
            {l.id === activeId && lists.length > 1 && (
              <button className="pr-1.5 text-zinc-500 hover:text-red-400" onClick={() => onDelete(l.id)} aria-label={`Supprimer ${l.name}`}>
                <X size={12} />
              </button>
            )}
          </div>
        ),
      )}
      <button
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
        onClick={() => setEditingId(onAdd())}
        title="Nouvelle liste"
        aria-label="Nouvelle liste"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
