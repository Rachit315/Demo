import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AnimatePresence,
  motion,
  useSpring,
  useTransform,
  type MotionValue,
  type Transition,
} from "motion/react";
import { Check, CircleArrowDown, Paperclip } from "lucide-react";

type DropZoneProps = {
  /* corner — 0 to 40px, radius of the zone */
  corner?: number;
  /* how long the fake upload runs before the check lands, in ms */
  uploadMs?: number;
};

type Phase = "idle" | "over" | "uploading" | "done";

const W = 380;
const H = 280;
const RINGS = 8;
/* the magnet: how far the inner rings may lean towards the pointer */
const PULL_X = 46;
const PULL_Y = 34;

const morph: Transition = { type: "spring", visualDuration: 0.5, bounce: 0.18 };
const quick: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };

type Rect = { left: number; top: number; width: number; height: number; borderRadius: number };

/* idle: tight, evenly spaced rings framing the label */
function idleRect(i: number, radius: number): Rect {
  const inset = 7 + i * 10;
  return {
    left: inset,
    top: inset,
    width: W - inset * 2,
    height: H - inset * 2,
    borderRadius: Math.max(8, radius - 4 - i * 2.2),
  };
}

/* over: a tunnel — rings bunch up as they fall towards the centre */
const depth = [0.14, 0.33, 0.5, 0.63, 0.73, 0.8, 0.85, 0.88];
function tunnelRect(i: number, radius: number): Rect {
  const f = depth[i];
  const w = W * (1 - f);
  const h = H * (1 - f);
  return {
    left: (W - w) / 2,
    top: (H - h) / 2,
    width: w,
    height: h,
    borderRadius: Math.max(6, (radius - 4) * (1 - f) + 4),
  };
}

/* uploading: the innermost ring becomes the pill, the rest stack behind it
   like drawers spilling off the bottom edge */
const PILL_W = 200;
const PILL_H = 54;
function stackRect(i: number): Rect {
  const s = RINGS - 1 - i;
  const width = PILL_W + s * 20;
  return {
    left: (W - width) / 2,
    top: H / 2 - PILL_H / 2 + s * 8,
    width,
    height: s === 0 ? PILL_H : H,
    borderRadius: 13 + s,
  };
}

export function DropZone({ corner = 28, uploadMs = 1700 }: DropZoneProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0);
  const depthCounter = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const radius = Math.min(40, Math.max(0, corner));

  /* pointer position inside the zone, -1..1 on each axis */
  const mx = useSpring(0, { stiffness: 220, damping: 22, mass: 0.6 });
  const my = useSpring(0, { stiffness: 220, damping: 22, mass: 0.6 });

  /* a file dropped beside the zone shouldn't make the browser navigate to it */
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const busy = phase === "uploading" || phase === "done";

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  const track = (e: DragEvent) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    mx.set(Math.max(-1, Math.min(1, nx)));
    my.set(Math.max(-1, Math.min(1, ny)));
  };

  const release = () => {
    depthCounter.current = 0;
    mx.set(0);
    my.set(0);
  };

  const upload = (files: number) => {
    timers.current.forEach(clearTimeout);
    setCount(files);
    setPhase("uploading");
    timers.current = [
      window.setTimeout(() => setPhase("done"), uploadMs),
      window.setTimeout(() => setPhase("idle"), uploadMs + 1300),
    ];
  };

  const onDragEnter = (e: DragEvent) => {
    if (busy || !hasFiles(e)) return;
    e.preventDefault();
    depthCounter.current += 1;
    track(e);
    setPhase("over");
  };
  const onDragOver = (e: DragEvent) => {
    if (busy || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    track(e);
  };
  const onDragLeave = () => {
    if (busy) return;
    depthCounter.current -= 1;
    if (depthCounter.current <= 0) {
      release();
      setPhase("idle");
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (busy) return;
    release();
    upload(Math.max(1, e.dataTransfer.files.length));
  };

  const over = phase === "over";

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <motion.div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label="Upload files: drop them here or press Enter to browse"
        aria-busy={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        initial={false}
        animate={phase}
        variants={{
          idle: {
            scale: 1,
            backgroundColor: "#ffffff",
            boxShadow:
              "inset 0 0 0 0px #1b1b1d, inset 0 0 0 0px #3a3a3e, 0 22px 44px -18px rgb(0 10 60 / 0.45), 0 2px 6px rgb(0 10 60 / 0.12)",
          },
          over: {
            scale: 1.07,
            backgroundColor: "#030303",
            boxShadow:
              "inset 0 0 0 6px #1b1b1d, inset 0 0 0 7px #3a3a3e, 0 30px 60px -20px rgb(0 0 20 / 0.75), 0 2px 8px rgb(0 0 20 / 0.35)",
          },
          /* the hole collapses: a grey flash on the way back to paper */
          uploading: {
            scale: [1.07, 0.98, 1],
            backgroundColor: ["#030303", "#bfbfc2", "#ffffff"],
            boxShadow:
              "inset 0 0 0 0px #1b1b1d, inset 0 0 0 0px #3a3a3e, 0 22px 44px -18px rgb(0 10 60 / 0.45), 0 2px 6px rgb(0 10 60 / 0.12)",
            transition: { duration: 0.55, times: [0, 0.4, 1], ease: "easeOut" },
          },
          done: { scale: 1, backgroundColor: "#ffffff" },
        }}
        transition={morph}
        className="relative size-full cursor-pointer overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        style={{ borderRadius: radius }}
      >
        {/* debris being pulled into the hole */}
        <AnimatePresence>
          {over && (
            <motion.div
              key="debris"
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: quick }}
            >
              <Debris mx={mx} my={my} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* the rings */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: RINGS }, (_, i) => (
            <Ring key={i} index={i} phase={phase} radius={radius} mx={mx} my={my} />
          ))}
        </div>

        {/* fade the bottom of the drawer stack into the card */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent"
          initial={false}
          animate={{ opacity: busy ? 1 : 0 }}
          transition={quick}
        />

        {/* labels */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {phase === "idle" && (
              <motion.div
                key="idle"
                className="flex items-center gap-2 text-[14px] font-medium text-zinc-500"
                initial={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...morph, delay: 0.12 } }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)", transition: quick }}
              >
                <motion.span
                  animate={{ rotate: [0, -12, 8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
                  className="grid"
                >
                  <Paperclip className="size-[17px]" strokeWidth={2} />
                </motion.span>
                Drag file here
              </motion.div>
            )}

            {over && <OverLabel key="over" mx={mx} my={my} />}

            {busy && (
              <motion.div
                key="busy"
                className="relative z-10 flex items-center gap-2.5 text-[14px] font-medium text-zinc-500"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { ...morph, delay: 0.18 } }}
                exit={{ opacity: 0, y: -4, transition: quick }}
              >
                <span className="relative grid size-4 place-items-center">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {phase === "uploading" ? (
                      <motion.span
                        key="spin"
                        className="absolute inset-0"
                        exit={{ opacity: 0, scale: 0.4, transition: quick }}
                      >
                        <Spinner />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="check"
                        className="absolute inset-0 grid place-items-center text-zinc-500"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", visualDuration: 0.35, bounce: 0.45 }}
                      >
                        <Check className="size-4" strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="tabular-nums">
                  {phase === "uploading" ? "Uploading file(s)..." : `${count} file${count === 1 ? "" : "s"} uploaded`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const n = e.target.files?.length ?? 0;
          if (n) upload(n);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Ring({
  index,
  phase,
  radius,
  mx,
  my,
}: {
  index: number;
  phase: Phase;
  radius: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  /* inner rings lean further towards the pointer — the tunnel bends */
  const lean = depth[index];
  const x = useTransform(mx, (v) => v * PULL_X * lean);
  const y = useTransform(my, (v) => v * PULL_Y * lean);

  const stackIndex = RINGS - 1 - index;
  const isPill = stackIndex === 0;

  const rect =
    phase === "over" ? tunnelRect(index, radius) : phase === "idle" ? idleRect(index, radius) : stackRect(index);

  const look =
    phase === "over"
      ? {
          borderColor: `rgb(255 255 255 / ${Math.max(0.12, 0.85 - index * 0.11)})`,
          backgroundColor: "rgb(255 255 255 / 0)",
          opacity: 1,
        }
      : phase === "idle"
        ? {
            borderColor: index === 0 ? "rgb(150 140 175 / 0.75)" : `rgb(160 160 170 / ${0.6 - index * 0.04})`,
            backgroundColor: "rgb(255 255 255 / 0)",
            opacity: 1,
          }
        : {
            borderColor: isPill ? "rgb(120 120 130 / 0.75)" : `rgb(150 150 160 / ${0.55 - stackIndex * 0.05})`,
            backgroundColor: "rgb(255 255 255 / 1)",
            opacity: 1,
          };

  /* rings travel one after another so the morph reads as a ripple */
  const order = phase === "over" ? index : stackIndex;

  return (
    <motion.div
      className="absolute border border-dashed"
      style={{ x, y, zIndex: phase === "idle" || phase === "over" ? index : RINGS - stackIndex }}
      initial={false}
      animate={{ ...rect, ...look }}
      transition={{ ...morph, delay: order * 0.018, borderColor: quick, backgroundColor: quick }}
    />
  );
}

function OverLabel({ mx, my }: { mx: MotionValue<number>; my: MotionValue<number> }) {
  /* the label rides with the deepest ring */
  const x = useTransform(mx, (v) => v * PULL_X * depth[RINGS - 1]);
  const y = useTransform(my, (v) => v * PULL_Y * depth[RINGS - 1]);
  return (
    <motion.div style={{ x, y }}>
      <motion.div
        className="flex items-center gap-2.5 text-[17px] font-medium text-white"
        initial={{ opacity: 0, scale: 0.7, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...morph, delay: 0.08 } }}
        exit={{ opacity: 0, scale: 0.6, filter: "blur(6px)", transition: quick }}
      >
        <motion.span
          className="grid text-white/70"
          animate={{ y: [0, 2.5, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        >
          <CircleArrowDown className="size-[22px]" strokeWidth={1.75} />
        </motion.span>
        Release file
      </motion.div>
    </motion.div>
  );
}

/* bits of matter spiralling in from the rim; each piece starts somewhere
   around the edge and shrinks to nothing at the core */
const debris = [
  { a: 200, r: 1.05, s: 20, kind: "sq", d: 3.2, delay: 0 },
  { a: 335, r: 1.0, s: 16, kind: "sq", d: 2.8, delay: 0.6 },
  { a: 95, r: 1.02, s: 7, kind: "dot", d: 2.4, delay: 0.3 },
  { a: 20, r: 1.08, s: 22, kind: "sq", d: 3.6, delay: 1.2 },
  { a: 260, r: 0.95, s: 6, kind: "dot", d: 2.2, delay: 1.5 },
  { a: 145, r: 1.1, s: 18, kind: "sq", d: 3.4, delay: 2.0 },
  { a: 300, r: 0.9, s: 8, kind: "dot", d: 2.6, delay: 0.9 },
  { a: 60, r: 1.0, s: 14, kind: "sq", d: 3.0, delay: 2.4 },
  { a: 230, r: 1.12, s: 5, kind: "dot", d: 2.0, delay: 1.8 },
  { a: 170, r: 0.92, s: 12, kind: "sq", d: 2.9, delay: 0.2 },
];

function Debris({ mx, my }: { mx: MotionValue<number>; my: MotionValue<number> }) {
  const x = useTransform(mx, (v) => v * PULL_X * 0.7);
  const y = useTransform(my, (v) => v * PULL_Y * 0.7);
  return (
    <motion.div className="absolute left-1/2 top-1/2" style={{ x, y }}>
      {debris.map((p, i) => {
        const rad = (p.a * Math.PI) / 180;
        const sx = Math.cos(rad) * (W / 2) * p.r;
        const sy = Math.sin(rad) * (H / 2) * p.r;
        /* a quarter turn of swirl on the way in */
        const mid = rad + Math.PI / 4;
        const midX = Math.cos(mid) * (W / 4) * p.r;
        const midY = Math.sin(mid) * (H / 4) * p.r;
        return (
          <motion.span
            key={i}
            className={
              "absolute block " +
              (p.kind === "sq" ? "rounded-[5px] bg-zinc-700" : "rounded-full bg-zinc-500/80")
            }
            style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
            initial={{ x: sx, y: sy, opacity: 0, scale: 1 }}
            animate={{
              x: [sx, midX, 0],
              y: [sy, midY, 0],
              opacity: [0, 0.9, 0],
              scale: [1, 0.7, 0.1],
              rotate: [0, 120, 300],
            }}
            transition={{
              duration: p.d,
              delay: p.delay,
              repeat: Infinity,
              ease: [0.55, 0, 0.85, 0.6],
              times: [0, 0.55, 1],
            }}
          />
        );
      })}
    </motion.div>
  );
}

function Spinner() {
  return (
    <motion.svg
      viewBox="0 0 16 16"
      className="size-4"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.75} />
      <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </motion.svg>
  );
}
