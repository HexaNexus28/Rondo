import { motion, AnimatePresence } from "motion/react";
import { Play, Pause } from "lucide-react";

export default function PlayButton({ playing, onClick, disabled, size = "lg" }) {
  const box = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const glyph = size === "lg" ? 20 : 16;
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={`grid ${box} shrink-0 place-items-center rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30`}
      onClick={onClick}
      disabled={disabled}
      aria-label={playing ? "Pause" : "Lecture"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={playing ? "pause" : "play"}
          initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.12 }}
          className="grid place-items-center"
        >
          {playing ? <Pause size={glyph} fill="currentColor" /> : <Play size={glyph} fill="currentColor" className="translate-x-px" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
