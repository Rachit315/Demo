import { useEffect, useMemo, useRef } from "react";
import { animate, stagger } from "motion/react";

/* the four tones the artwork is painted in, darkest first */
export const TONES = ["#8188f3", "#a7abf7", "#cbcdfa", "#eeeffe"] as const;

const COLS = 30;
const ROWS = 21;

type Cell = { col: number; row: number; tone: number; stray: boolean };

type MosaicProps = {
  /* squares climb down from the left edge, dots climb up to the right edge */
  variant: "squares" | "dots";
  seed?: number;
  className?: string;
};

/* small deterministic RNG so the artwork is the same on every load */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTone(r: number) {
  if (r < 0.52) return 0;
  if (r < 0.78) return 1;
  if (r < 0.91) return 2;
  return 3;
}

function buildCells(variant: MosaicProps["variant"], seed: number): Cell[] {
  const rand = rng(seed);
  const cells: Cell[] = [];

  for (let col = 0; col < COLS; col++) {
    /* t runs 0 → 1 from the low end of the slope to the tall edge */
    const t = variant === "squares" ? 1 - col / (COLS - 1) : col / (COLS - 1);
    const curve = variant === "squares" ? Math.pow(t, 1.15) * 19 + 1 : Math.pow(t, 1.3) * 16 + 1.5;
    const jitter = variant === "squares" ? (rand() - 0.5) * 3.2 : (rand() - 0.5) * 2.2;
    const height = Math.max(1, Math.min(ROWS - 2, Math.round(curve + jitter)));

    for (let row = 0; row < height; row++) {
      /* a few gaps near the ragged top edge */
      if (row > height - 3 && row > 1 && rand() < 0.1) continue;
      cells.push({ col, row, tone: pickTone(rand()), stray: false });
    }

    /* loose pieces floating just above the slope */
    if (rand() < 0.3) {
      const lift = height + 1 + Math.floor(rand() * 2);
      if (lift < ROWS) cells.push({ col, row: lift, tone: pickTone(rand() * 0.6 + 0.4), stray: true });
    }
  }
  return cells;
}

export function Mosaic({ variant, seed = 7, className = "" }: MosaicProps) {
  const cells = useMemo(() => buildCells(variant, seed), [variant, seed]);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDot = variant === "dots";

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.children) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const lit = new Set<number>();
    let ready = false;

    /* ── entrance: the slope builds itself bottom-up, low end first ── */
    const order = els
      .map((el, i) => {
        const c = cells[i];
        const fromEdge = variant === "squares" ? COLS - 1 - c.col : c.col;
        return { el, key: c.row * 1.6 + fromEdge * 0.35 + Math.random() * 2.4 + (c.stray ? 6 : 0) };
      })
      .sort((a, b) => a.key - b.key)
      .map((o) => o.el);

    if (reduce) {
      order.forEach((el) => (el.style.opacity = "1"));
      ready = true;
    } else {
      const entrance = animate(
        order,
        isDot
          ? { opacity: [0, 1], scale: [0, 1] }
          : { opacity: [0, 1], y: ["-140%", "0%"] },
        {
          type: "spring",
          visualDuration: 0.55,
          bounce: isDot ? 0.45 : 0.25,
          delay: stagger(0.0032, { startDelay: 0.45 }),
        },
      );
      entrance.then(() => (ready = true));
    }

    /* ── idle: a slow shimmer of tones moving across the surface ── */
    const tint = (el: HTMLElement, color: string, duration = 0.9) =>
      animate(el, { backgroundColor: color }, { duration, ease: "easeInOut" });

    if (!reduce) {
      const twinkle = window.setInterval(() => {
        if (!ready || document.hidden) return;
        for (let n = 0; n < 2; n++) {
          const i = Math.floor(Math.random() * els.length);
          if (lit.has(i)) continue;
          const tone = pickTone(Math.random());
          cells[i].tone = tone;
          tint(els[i], TONES[tone], 1.1);
        }
      }, 110);
      timers.push(twinkle);
    }

    /* ── pointer: cells near the cursor light up and settle back ── */
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const update = () => {
      frame = 0;
      if (!ready) return;
      const box = root.getBoundingClientRect();
      const pitch = box.width / COLS;
      const radius = 2.6;
      const next = new Set<number>();

      if (pointer) {
        const gx = (pointer.x - box.left) / pitch;
        const gy = (box.bottom - pointer.y) / pitch;
        cells.forEach((c, i) => {
          const d = Math.hypot(c.col + 0.5 - gx, c.row + 0.5 - gy);
          if (d < radius) next.add(i);
        });
      }

      next.forEach((i) => {
        if (lit.has(i)) return;
        animate(els[i], { backgroundColor: TONES[3] }, { duration: 0.12 });
        /* dots pinch in; squares only brighten so no seams open up */
        if (!reduce && isDot)
          animate(els[i], { scale: 0.72 }, { type: "spring", visualDuration: 0.25, bounce: 0.4 });
      });
      lit.forEach((i) => {
        if (next.has(i)) return;
        tint(els[i], TONES[cells[i].tone], 0.7);
        if (!reduce && isDot) animate(els[i], { scale: 1 }, { type: "spring", visualDuration: 0.5, bounce: 0.5 });
      });
      lit.clear();
      next.forEach((i) => lit.add(i));
    };

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => {
      pointer = null;
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      timers.forEach(clearInterval);
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [cells, isDot, variant]);

  const pitch = 100 / COLS;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`pointer-events-none relative ${className}`}
      style={{ aspectRatio: `${COLS} / ${ROWS}` }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className="absolute will-change-transform"
          style={{
            left: `${c.col * pitch}%`,
            bottom: `${(c.row * 100) / ROWS}%`,
            /* squares overlap by half a pixel so no seams show between them */
            width: isDot ? `${pitch}%` : `calc(${pitch}% + 0.5px)`,
            height: isDot ? `${100 / ROWS}%` : `calc(${100 / ROWS}% + 0.5px)`,
            padding: isDot ? "0.2%" : 0,
            backgroundClip: "content-box",
            borderRadius: isDot ? "999px" : 0,
            backgroundColor: TONES[c.tone],
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
