import type { Transition } from "motion/react";

/* same motion vocabulary as SelectionList: one spring drives every morph so
   all the pieces land together, plus a short eased fade for opacity */
export const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
export const fade = (delay = 0): Transition => ({ duration: 0.22, ease: [0.25, 0.1, 0.25, 1], delay });
