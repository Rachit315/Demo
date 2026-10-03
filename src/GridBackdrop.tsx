import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";

type GridBackdropProps = {
  /* 0–1, how hard the prompt bar is glowing right now */
  energy: MotionValue<number>;
  /* 0–1, eased focus of the prompt bar */
  focus: MotionValue<number>;
  /* 0–1, where the bar sits vertically, so its light spills from there */
  anchorY?: number;
};

/* tile size follows the viewport so the grid reads the same on a phone
   (about five tiles across) as it does on a desktop (capped at 212px) */
function tileFor(width: number) {
  return Math.round(Math.min(212, Math.max(88, width / 5.1)));
}

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

/* small deterministic hash so the starting pattern is the same on every load */
function seeded(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function GridBackdrop({ energy, focus, anchorY = 0.5 }: GridBackdropProps) {
  const { w, h } = useViewport();
  const reduce = useReducedMotion();
  const tile = tileFor(w);

  /* one tile is centred on the viewport, the rest are laid out from it */
  const cols = Math.ceil(w / tile) + 2;
  const rows = Math.ceil(h / tile) + 2;
  const originX = w / 2 - tile / 2 - Math.ceil(cols / 2) * tile;
  const originY = h / 2 - tile / 2 - Math.ceil(rows / 2) * tile;
  const count = cols * rows;

  const initial = useMemo(() => {
    const on = new Set<number>();
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      /* loose checkerboard, thinned out at random like the reference */
      if ((r + c) % 2 === 0 && seeded(i) > 0.45) on.add(i);
    }
    return on;
  }, [count, cols]);

  const [lit, setLit] = useState(initial);
  useEffect(() => setLit(initial), [initial]);

  /* every so often one tile dims and another lights up, so the wall breathes */
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setLit((prev) => {
        const next = new Set(prev);
        const on = [...next];
        if (on.length) next.delete(on[Math.floor(Math.random() * on.length)]);
        next.add(Math.floor(Math.random() * count));
        return next;
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, [count, reduce]);

  const spill = useTransform(() => 0.35 + focus.get() * 0.25 + energy.get() * 0.4);

  const lineX = ((originX % tile) + tile) % tile;
  const lineY = ((originY % tile) + tile) % tile;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-black">
      {Array.from({ length: count }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: originX + c * tile,
              top: originY + r * tile,
              width: tile,
              height: tile,
              background: "linear-gradient(135deg, #151515 0%, #0e0e0e 55%, #0a0a0a 100%)",
            }}
            initial={false}
            animate={{ opacity: lit.has(i) ? 1 : 0 }}
            transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          />
        );
      })}

      {/* red light from the prompt bar spilling onto the wall */}
      <motion.div
        className="absolute left-1/2 h-[70vmin] w-[110vmin] -translate-x-[45%] -translate-y-1/2"
        initial={false}
        animate={{ top: `${anchorY * 100}%` }}
        transition={{ type: "spring", visualDuration: 0.6, bounce: 0.1 }}
        style={{
          opacity: spill,
          background:
            "radial-gradient(closest-side, rgb(150 0 0 / 0.38), rgb(90 0 0 / 0.16) 45%, transparent 100%)",
        }}
      />

      {/* hairline grid, faintly red, fading out toward the edges */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 40 40 / 0.11) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 40 40 / 0.11) 1px, transparent 1px)",
          backgroundSize: `${tile}px ${tile}px`,
          backgroundPosition: `${lineX}px ${lineY}px`,
          maskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* vignette keeps the corners black like the reference */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgb(0 0 0 / 0.85) 100%)" }}
      />
    </div>
  );
}
