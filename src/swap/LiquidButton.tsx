import type { ReactNode } from "react";
import { motion } from "motion/react";
import { morph } from "./motion";

/* soft light pools that drift across the button, like light through water */
const blobs = [
  { w: 120, h: 60, top: -16, dur: 5.5, delay: 0, color: "rgb(170 225 255 / 0.95)" },
  { w: 95, h: 50, top: 8, dur: 7, delay: -2.5, color: "rgb(125 205 255 / 0.85)" },
  { w: 135, h: 68, top: -6, dur: 8.5, delay: -5, color: "rgb(200 238 255 / 0.7)" },
];

/* tiny glints that twinkle on the surface */
const sparks = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 18 + ((i * 53) % 64),
  dur: 1.6 + (i % 5) * 0.35,
  delay: (i * 0.29) % 2,
}));

export function LiquidButton({
  children,
  disabled,
  busy,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      whileHover={disabled || busy ? undefined : { scale: 1.015 }}
      whileTap={disabled || busy ? undefined : { scale: 0.97 }}
      animate={{ filter: disabled ? "saturate(0.25) brightness(1.08)" : "saturate(1) brightness(1)" }}
      transition={morph}
      className="relative mt-0.5 h-[46px] w-full cursor-pointer overflow-hidden rounded-full text-[15px] font-normal text-white outline-none focus-visible:ring-2 focus-visible:ring-sw-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sw-page disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(180deg, #4d82ff 0%, #2f64f5 100%)",
        boxShadow:
          "inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 -2px 6px rgb(10 40 160 / 0.35), 0 10px 22px -12px rgb(47 100 245 / 0.8)",
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen">
        {blobs.map((b, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.w,
              height: b.h,
              top: b.top,
              left: -b.w,
              background: `radial-gradient(closest-side, ${b.color}, transparent)`,
              filter: "blur(10px)",
            }}
            animate={{ x: ["0%", "480%"] }}
            transition={{ duration: busy ? b.dur / 2.5 : b.dur, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {sparks.map((s, i) => (
          <motion.span
            key={`s${i}`}
            className="absolute size-[2px] rounded-full bg-white"
            style={{ left: `${s.left}%`, top: `${s.top}%` }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.2, 0.4] }}
            transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </span>
      <span className="relative block">{children}</span>
    </motion.button>
  );
}
