import { useEffect, useImperativeHandle, useRef, useState, type DragEvent, type Ref } from "react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useSpring,
  useTransform,
  type MotionValue,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import { CircleArrowDown, Paperclip } from "lucide-react";
import { palettes, type Palette, type Theme } from "./dropTheme";

export type Phase = "idle" | "over" | "collapse" | "uploading" | "done";

/* lets something other than a native file drag (the demo file) drive the
   zone with plain pointer coordinates */
export type DropZoneHandle = {
  /* pointer moved while carrying a file; returns true when it is over the zone */
  dragMove(x: number, y: number): boolean;
  /* pointer released; returns true when the zone took the file */
  dragEnd(x: number, y: number): boolean;
  /* where a dropped file should be swallowed, in viewport coordinates */
  center(): { x: number; y: number } | null;
};

type DropZoneProps = {
  ref?: Ref<DropZoneHandle>;
  theme?: Theme;
  /* corner — 0 to 40px, radius of the zone */
  corner?: number;
  /* how long the spinner runs before the check lands, in ms */
  uploadMs?: number;
  onPhaseChange?: (phase: Phase) => void;
};

const W = 380;
const H = 280;
const RINGS = 8;
/* the magnet: how far the inner rings may lean towards the pointer */
const PULL_X = 46;
const PULL_Y = 34;
const COLLAPSE_MS = 380;
const DONE_MS = 1300;

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
function tunnelRect(i: number, radius: number, squeeze = 1): Rect {
  const f = depth[i];
  const w = W * (1 - f) * squeeze;
  const h = H * (1 - f) * squeeze;
  return {
    left: (W - w) / 2,
    top: (H - h) / 2,
    width: w,
    height: h,
    borderRadius: Math.max(6, (radius - 4) * (1 - f) * squeeze + 4),
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

function cardTarget(phase: Phase, prev: Phase, p: Palette): TargetAndTransition {
  switch (phase) {
    case "over":
      /* paper → grey → ink: the zone dims into a hole as the file arrives */
      return {
        scale: 1.07,
        backgroundColor: prev === "idle" ? [p.card, p.flash, p.flashDeep, p.hole] : p.hole,
        boxShadow: p.holeShadow,
        transition: {
          ...morph,
          backgroundColor: { duration: 0.45, times: [0, 0.3, 0.62, 1], ease: "easeOut" },
          boxShadow: { duration: 0.35 },
        },
      };
    case "collapse":
      /* the hole swallows the file and pulls itself in */
      return {
        scale: 0.95,
        backgroundColor: p.hole,
        boxShadow: p.holeShadow,
        transition: { type: "spring", visualDuration: 0.34, bounce: 0 },
      };
    case "uploading":
      /* …then flashes back out to paper */
      return {
        scale: 1,
        backgroundColor: [p.hole, p.flashDeep, p.flash, p.card],
        boxShadow: p.restShadow,
        transition: {
          ...morph,
          backgroundColor: { duration: 0.6, times: [0, 0.28, 0.58, 1], ease: "easeOut" },
          boxShadow: { duration: 0.4 },
        },
      };
    default:
      return {
        scale: 1,
        backgroundColor: p.card,
        boxShadow: p.restShadow,
        transition: { ...morph, backgroundColor: { duration: 0.32 }, boxShadow: { duration: 0.32 } },
      };
  }
}

export function DropZone({ ref, theme = "light", corner = 28, uploadMs = 2200, onPhaseChange }: DropZoneProps) {
  const [phase, setPhaseState] = useState<Phase>("idle");
  /* bumps each time the zone flips between paper and hole, so the rings
     can blink out while they rearrange */
  const [flip, setFlip] = useState(0);
  const phaseRef = useRef<Phase>("idle");
  const prevRef = useRef<Phase>("idle");
  const nativeDepth = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const radius = Math.min(40, Math.max(0, corner));
  const p = palettes[theme];

  const setPhase = (next: Phase) => {
    const cur = phaseRef.current;
    if (cur === next) return;
    prevRef.current = cur;
    phaseRef.current = next;
    if ((cur === "idle" && next === "over") || (cur === "over" && next === "idle")) setFlip((n) => n + 1);
    setPhaseState(next);
  };

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

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

  const inside = (x: number, y: number) => {
    const r = cardRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const track = (x: number, y: number) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(Math.max(-1, Math.min(1, ((x - r.left) / r.width) * 2 - 1)));
    my.set(Math.max(-1, Math.min(1, ((y - r.top) / r.height) * 2 - 1)));
  };

  const release = () => {
    nativeDepth.current = 0;
    mx.set(0);
    my.set(0);
  };

  const accept = () => {
    release();
    timers.current.forEach(clearTimeout);
    setPhase("collapse");
    timers.current = [
      window.setTimeout(() => setPhase("uploading"), COLLAPSE_MS),
      window.setTimeout(() => setPhase("done"), COLLAPSE_MS + uploadMs),
      window.setTimeout(() => setPhase("idle"), COLLAPSE_MS + uploadMs + DONE_MS),
    ];
  };

  const open = () => phaseRef.current === "idle" || phaseRef.current === "over";

  useImperativeHandle(ref, () => ({
    dragMove(x, y) {
      if (!open()) return false;
      const hit = inside(x, y);
      if (hit) {
        track(x, y);
        setPhase("over");
      } else if (phaseRef.current === "over") {
        release();
        setPhase("idle");
      }
      return hit;
    },
    dragEnd(x, y) {
      if (phaseRef.current !== "over") return false;
      if (inside(x, y)) {
        accept();
        return true;
      }
      release();
      setPhase("idle");
      return false;
    },
    center() {
      const r = cardRef.current?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    },
  }));

  /* real files dragged in from the desktop */
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragEnter = (e: DragEvent) => {
    if (!open() || !hasFiles(e)) return;
    e.preventDefault();
    nativeDepth.current += 1;
    track(e.clientX, e.clientY);
    setPhase("over");
  };
  const onDragOver = (e: DragEvent) => {
    if (!open() || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    track(e.clientX, e.clientY);
  };
  const onDragLeave = () => {
    if (phaseRef.current !== "over") return;
    nativeDepth.current -= 1;
    if (nativeDepth.current <= 0) {
      release();
      setPhase("idle");
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (phaseRef.current === "over" && e.dataTransfer.files.length > 0) accept();
  };

  const over = phase === "over";
  const hole = over || phase === "collapse";
  const busy = phase === "uploading" || phase === "done";

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <motion.div
        ref={cardRef}
        role="region"
        aria-label="File drop zone"
        aria-busy={busy}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        initial={false}
        animate={cardTarget(phase, prevRef.current, p)}
        className="relative size-full overflow-hidden"
        style={{ borderRadius: radius }}
      >
        {/* debris being pulled into the hole */}
        <AnimatePresence>
          {hole && (
            <motion.div
              key="debris"
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.2 } }}
              exit={{ opacity: 0, transition: quick }}
            >
              <Debris mx={mx} my={my} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* the rings */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: RINGS }, (_, i) => (
            <Ring key={i} index={i} phase={phase} flip={flip} radius={radius} palette={p} mx={mx} my={my} />
          ))}
        </div>

        {/* fade the bottom of the drawer stack into the card */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          initial={false}
          animate={{
            opacity: busy ? 1 : 0,
            backgroundImage: `linear-gradient(to top, ${p.card}, ${p.cardFade}, ${p.cardClear})`,
          }}
          transition={{ duration: 0.3, delay: busy ? 0.25 : 0 }}
        />

        {/* labels */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {phase === "idle" && (
              <motion.div
                key="idle"
                className="flex items-center gap-2 text-[14px] font-medium"
                initial={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                  color: p.text,
                  transition: { ...morph, delay: prevRef.current === "done" ? 0.3 : 0.12, color: { duration: 0.3 } },
                }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: 0.12 } }}
              >
                <Paperclip className="size-[17px]" strokeWidth={2} />
                Drag file here
              </motion.div>
            )}

            {hole && <HoleLabel key="hole" mx={mx} my={my} sinking={phase === "collapse"} />}

            {busy && (
              <motion.div
                key="busy"
                className="relative z-10 flex items-center gap-2.5 text-[14px] font-medium"
                initial={{ opacity: 0, filter: "blur(6px)", scale: 0.96 }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                  scale: 1,
                  color: p.text,
                  transition: { duration: 0.45, delay: 0.3, ease: "easeOut", color: { duration: 0.3 } },
                }}
                exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.25 } }}
              >
                <span className="relative grid size-4 place-items-center">
                  <AnimatePresence initial={false}>
                    {phase === "uploading" ? (
                      <motion.span
                        key="spin"
                        className="absolute inset-0"
                        exit={{ scale: 0, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } }}
                      >
                        <Spinner />
                      </motion.span>
                    ) : (
                      <motion.span key="check" className="absolute inset-0">
                        <DrawnCheck />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                Uploading file(s)...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="sr-only" aria-live="polite">
        {phase === "over"
          ? "Release to upload"
          : phase === "uploading"
            ? "Uploading file"
            : phase === "done"
              ? "Upload complete"
              : ""}
      </p>
    </div>
  );
}

function Ring({
  index,
  phase,
  flip,
  radius,
  palette: p,
  mx,
  my,
}: {
  index: number;
  phase: Phase;
  flip: number;
  radius: number;
  palette: Palette;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  /* inner rings lean further towards the pointer — the tunnel bends */
  const lean = depth[index];
  const x = useTransform(mx, (v) => v * PULL_X * lean);
  const y = useTransform(my, (v) => v * PULL_Y * lean);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  /* blink out while the zone swaps between paper and hole, so the rings
     rearrange unseen and fade back in already in their new shape */
  useEffect(() => {
    if (flip === 0) return;
    animate(scope.current, { opacity: [1, 0, 0, 1] }, { duration: 0.6, times: [0, 0.15, 0.35, 1], ease: "easeOut" });
  }, [flip, animate, scope]);

  const s = RINGS - 1 - index;
  const isPill = s === 0;

  let rect: Rect;
  let borderColor: string;
  let backgroundColor: string;
  if (phase === "over" || phase === "collapse") {
    rect = tunnelRect(index, radius, phase === "collapse" ? 0.82 : 1);
    borderColor = `rgba(255, 255, 255, ${Math.max(0.12, 0.85 - index * 0.11)})`;
    backgroundColor = "rgba(0, 0, 0, 0)";
  } else if (phase === "idle") {
    rect = idleRect(index, radius);
    borderColor = index === 0 ? p.ringFirst : `rgb(${p.ring} / ${p.ringAlpha - index * p.ringStep})`;
    backgroundColor = p.cardClear;
  } else {
    rect = stackRect(index);
    borderColor = isPill ? p.pillBorder : `rgb(${p.stack} / ${p.stackAlpha - s * 0.04})`;
    backgroundColor = isPill ? p.pill : p.card;
  }

  /* rings travel one after another so each morph reads as a ripple */
  const order = phase === "over" || phase === "collapse" ? index : s;
  const delay =
    phase === "uploading" ? 0.18 + order * 0.025 : phase === "over" ? 0.1 + order * 0.012 : 0.06 + order * 0.02;

  return (
    <motion.div
      ref={scope}
      className="absolute border border-dashed"
      style={{ x, y, zIndex: phase === "uploading" || phase === "done" ? RINGS - s : index }}
      initial={false}
      animate={{ ...rect, borderColor, backgroundColor }}
      transition={{
        ...morph,
        delay,
        borderColor: { duration: 0.3, delay: phase === "uploading" ? 0.2 : 0 },
        backgroundColor: { duration: 0.3, delay: phase === "uploading" ? 0.2 : 0 },
      }}
    />
  );
}

function HoleLabel({ mx, my, sinking }: { mx: MotionValue<number>; my: MotionValue<number>; sinking: boolean }) {
  /* the label rides with the deepest ring */
  const x = useTransform(mx, (v) => v * PULL_X * depth[RINGS - 1]);
  const y = useTransform(my, (v) => v * PULL_Y * depth[RINGS - 1]);
  return (
    <motion.div style={{ x, y }}>
      <motion.div
        className="flex items-center gap-2.5 text-[17px] font-medium text-white"
        initial={{ opacity: 0, scale: 0.7, filter: "blur(6px)" }}
        animate={
          sinking
            ? { opacity: 0.35, scale: 0.72, filter: "blur(1px)", transition: { duration: 0.3, ease: "easeIn" } }
            : { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...morph, delay: 0.18 } }
        }
        exit={{ opacity: 0, scale: 0.6, filter: "blur(6px)", transition: { duration: 0.15 } }}
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
      {debris.map((d, i) => {
        const rad = (d.a * Math.PI) / 180;
        const sx = Math.cos(rad) * (W / 2) * d.r;
        const sy = Math.sin(rad) * (H / 2) * d.r;
        /* a quarter turn of swirl on the way in */
        const mid = rad + Math.PI / 4;
        const midX = Math.cos(mid) * (W / 4) * d.r;
        const midY = Math.sin(mid) * (H / 4) * d.r;
        return (
          <motion.span
            key={i}
            className={"absolute block " + (d.kind === "sq" ? "rounded-[5px] bg-zinc-700" : "rounded-full bg-zinc-500/80")}
            style={{ width: d.s, height: d.s, marginLeft: -d.s / 2, marginTop: -d.s / 2 }}
            initial={{ x: sx, y: sy, opacity: 0, scale: 1 }}
            animate={{
              x: [sx, midX, 0],
              y: [sy, midY, 0],
              opacity: [0, 0.9, 0],
              scale: [1, 0.7, 0.1],
              rotate: [0, 120, 300],
            }}
            transition={{
              duration: d.d,
              delay: d.delay,
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

/* the spinner shrinks to a point, then the tick is drawn in */
function DrawnCheck() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none">
      <motion.path
        d="M3.2 8.6l3.1 3 6.5-7.2"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 0.32, delay: 0.18, ease: "easeOut" }, opacity: { duration: 0.01, delay: 0.18 } }}
      />
    </svg>
  );
}
