import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Ghost } from "lucide-react";
import { acceleratorFromEvent } from "../utils/accelerator";

const ACCENTS = {
  violet: "#8b5cf6",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
};
const SHORTCUT_LABELS = {
  toggle: "Lecture / Pause",
  next: "Piste suivante",
  prev: "Piste précédente",
  volumeUp: "Volume +",
  volumeDown: "Volume −",
  ghost: "Mode fantôme",
};
const OPACITY = { min: 20, max: 90 };
const section = "px-3 py-2";
const heading = "mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

function ShortcutRow({ action, accelerator, unavailable, onChange }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);

  const onKeyDown = async (e) => {
    e.preventDefault();
    if (e.key === "Escape") return setRecording(false);
    const accel = acceleratorFromEvent(e);
    if (!accel) return;
    setRecording(false);
    const result = await window.widget.setShortcut(action, accel);
    setError(result.ok ? null : result.error);
    if (result.ok) onChange();
  };

  return (
    <li className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-zinc-300">{SHORTCUT_LABELS[action]}</span>
      <button
        onClick={() => { setError(null); setRecording(true); }}
        onKeyDown={recording ? onKeyDown : undefined}
        onBlur={() => setRecording(false)}
        className={`min-w-28 rounded bg-white/5 px-2 py-1 text-[11px] tabular-nums transition-colors hover:bg-white/10 ${
          recording ? "text-violet-300 ring-1 ring-violet-500" : unavailable ? "text-red-400" : "text-zinc-200"
        }`}
        title={unavailable ? "Indisponible : déjà pris par une autre application" : undefined}
      >
        {recording ? "Appuyez… (Échap)" : accelerator}
      </button>
      {error && <span role="alert" className="basis-full text-right text-[10px] text-red-400">{error}</span>}
    </li>
  );
}

export default function Settings({ accent, onAccent, onClose }) {
  const [settings, setSettings] = useState(null);

  const refresh = () => window.widget.getSettings().then(setSettings);
  useEffect(() => {
    refresh();
  }, []);

  const update = (patch) => window.widget.updateSettings(patch).then(setSettings);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-x-0 bottom-0 top-8 z-20 flex flex-col overflow-y-auto bg-[#0f0f14]"
    >
      <div className="flex items-center justify-between px-3 pb-1">
        <h2 className="text-sm font-medium">Réglages</h2>
        <button className="grid h-7 w-7 place-items-center rounded text-zinc-400 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Fermer les réglages">
          <X size={16} />
        </button>
      </div>

      <div className={section}>
        <h3 className={heading}>Couleur</h3>
        <div className="flex gap-2">
          {Object.entries(ACCENTS).map(([name, color]) => (
            <button
              key={name}
              onClick={() => onAccent(name)}
              aria-label={`Couleur ${name}`}
              aria-pressed={accent === name}
              style={{ backgroundColor: color }}
              className={`h-6 w-6 rounded-full transition-transform ${accent === name ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0f0f14]" : "opacity-70 hover:opacity-100"}`}
            />
          ))}
        </div>
      </div>

      {settings && (
        <>
          <div className={section}>
            <h3 className={heading}>Mode fantôme</h3>
            <p className="mb-2 text-[11px] text-zinc-500">
              Fenêtre semi-transparente que la souris traverse. Pour en sortir : {settings.shortcuts.ghost} ou le menu de l’icône de notification.
            </p>
            <label className="mb-2 flex items-center gap-2 text-xs text-zinc-300">
              Opacité
              <input
                type="range" min={OPACITY.min} max={OPACITY.max} step={5}
                value={Math.round(settings.ghostOpacity * 100)}
                onChange={(e) => update({ ghostOpacity: Number(e.target.value) / 100 })}
                aria-label="Opacité en mode fantôme" className="h-1 flex-1 accent-violet-500"
              />
              <span className="w-8 text-right tabular-nums text-zinc-500">{Math.round(settings.ghostOpacity * 100)}%</span>
            </label>
            <button onClick={() => window.widget.toggleGhost()} className="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-xs transition-colors hover:bg-violet-600">
              <Ghost size={14} /> Activer le mode fantôme
            </button>
          </div>

          <div className={section}>
            <label className="flex items-center justify-between text-xs text-zinc-300">
              Aimanter aux bords de l’écran
              <input type="checkbox" checked={settings.snap} onChange={(e) => update({ snap: e.target.checked })} className="h-4 w-4 accent-violet-500" />
            </label>
          </div>

          <div className={section}>
            <h3 className={heading}>Raccourcis (globaux)</h3>
            <ul>
              {Object.entries(settings.shortcuts).map(([action, accelerator]) => (
                <ShortcutRow key={action} action={action} accelerator={accelerator} unavailable={settings.unavailable.includes(action)} onChange={refresh} />
              ))}
            </ul>
          </div>

          <div className={section}>
            <h3 className={heading}>À propos</h3>
            <p className="flex items-center justify-between text-xs text-zinc-300">
              Version <span className="tabular-nums text-zinc-200">{settings.version}</span>
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
