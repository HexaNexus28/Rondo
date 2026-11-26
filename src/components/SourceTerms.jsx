import { motion } from "motion/react";

const link = "text-violet-300 underline underline-offset-2 hover:text-violet-200";

/** Asked once per source, before its player is first used. Sits under the player, never over it. */
export default function SourceTerms({ source, onAccept, onCancel }) {
  const { name, terms } = source;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-x-0 bottom-0 top-[calc(2rem+56.25vw)] z-30 flex flex-col gap-3 overflow-y-auto bg-[#0f0f14] p-3"
    >
      <p className="text-[11px] leading-relaxed text-zinc-400">
        {terms.notice} En continuant, vous acceptez d’être lié par les{" "}
        <a className={link} href={terms.termsUrl} target="_blank">conditions d’utilisation de {name}</a>{" "}
        et ses <a className={link} href={terms.privacyUrl} target="_blank">règles de confidentialité</a>.
      </p>
      <div className="mt-auto flex justify-end gap-2">
        {/* A queue saved before the terms existed can only be played once they are accepted. */}
        {onCancel && (
          <button onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            Annuler
          </button>
        )}
        <button onClick={onAccept} className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-violet-500">
          Accepter et lire
        </button>
      </div>
    </motion.div>
  );
}
