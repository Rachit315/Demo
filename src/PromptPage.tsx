import { motion, useMotionValue } from "motion/react";
import { ArrowDown } from "lucide-react";
import { GridBackdrop } from "./GridBackdrop";
import { PromptBar } from "./PromptBar";
import { sounds } from "./sounds";

/* the vector kit: the plus mark and the bar's surface + glow, as one SVG */
const VECTOR_KIT = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="400" viewBox="0 0 1080 400">
  <defs>
    <linearGradient id="pill" x1="0" x2="1">
      <stop offset="0" stop-color="#1f1f21"/><stop offset="0.3" stop-color="#151516"/>
      <stop offset="0.58" stop-color="#0e0e0f" stop-opacity="0.75"/><stop offset="0.92" stop-color="#0a0a0a" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.42" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#cd0e0e" stop-opacity="0.95"/><stop offset="0.34" stop-color="#960000" stop-opacity="0.6"/>
      <stop offset="0.62" stop-color="#5a0000" stop-opacity="0.22"/><stop offset="0.78" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ink" x1="0" x2="1">
      <stop offset="0" stop-color="#fff"/><stop offset="0.7" stop-color="#a7a7a7"/><stop offset="1" stop-color="#6e6e6e"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="400" fill="#000"/>
  <path d="M142 117h880v166H142a83 83 0 0 1 0-166z" fill="url(#pill)"/>
  <ellipse cx="560" cy="200" rx="260" ry="120" fill="url(#glow)"/>
  <path d="M144 178v44M122 200h44" stroke="#ff1414" stroke-width="3"/>
  <text x="202" y="216" font-family="Inter, sans-serif" font-size="46" fill="#fff">Create</text>
  <rect x="374" y="148" width="4" height="104" rx="2" fill="#ff1f1f"/>
  <text x="386" y="216" font-family="Inter, sans-serif" font-size="46" fill="url(#ink)">Brand Intelligence</text>
</svg>`;

function downloadKit() {
  sounds.tick();
  const url = URL.createObjectURL(new Blob([VECTOR_KIT], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "create-bar-vector.svg";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PromptPage() {
  const energy = useMotionValue(0);
  const focus = useMotionValue(0);

  return (
    <div className="prompt-page relative min-h-dvh overflow-hidden text-white">
      <GridBackdrop energy={energy} focus={focus} />

      <main className="relative grid min-h-dvh place-items-center px-4 pb-28 pt-24">
        <div className="w-full max-w-[780px]">
          <PromptBar energy={energy} focus={focus} />
        </div>
      </main>

      <motion.button
        type="button"
        onClick={downloadKit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", visualDuration: 0.42, bounce: 0.16, delay: 0.3 }}
        whileHover="hover"
        whileTap={{ scale: 0.96 }}
        className="group absolute bottom-8 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-[15px] text-neutral-400 transition-colors hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-[#ff1f1f]/60"
      >
        <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-white/[0.08] text-neutral-300 ring-1 ring-white/10">
          <motion.span
            variants={{ hover: { y: [0, 14, -14, 0], transition: { duration: 0.5, times: [0, 0.45, 0.46, 1] } } }}
            className="block"
          >
            <ArrowDown className="size-3.5" strokeWidth={2} />
          </motion.span>
        </span>
        Free Vector Assets
      </motion.button>
    </div>
  );
}
