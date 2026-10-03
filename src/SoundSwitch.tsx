import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundOn, onSoundChange, setSoundOn, sounds } from "./sounds";

export function SoundSwitch() {
  const [on, setOn] = useState(isSoundOn);
  useEffect(() => onSoundChange(setOn), []);

  return (
    <motion.button
      type="button"
      aria-label={on ? "Mute sound effects" : "Turn on sound effects"}
      aria-pressed={on}
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        setSoundOn(!on);
        if (!on) sounds.tick();
      }}
      className={
        "relative grid size-[38px] cursor-pointer place-items-center rounded-full bg-surface shadow-[0_0_0_1px_var(--line),0_4px_12px_-6px_rgb(0_0_0/0.18)] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-subtle " +
        (on ? "text-ink" : "text-subtle hover:text-muted")
      }
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={on ? "on" : "off"}
          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
          transition={{ type: "spring", visualDuration: 0.3, bounce: 0.3 }}
          className="block"
        >
          {on ? <Volume2 className="size-4" strokeWidth={2} /> : <VolumeX className="size-4" strokeWidth={2} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
