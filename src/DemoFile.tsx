import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { Dog } from "lucide-react";
import type { DropZoneHandle } from "./DropZone";

const NAME = "hund vill ha";

type Mode = "rest" | "dragging" | "flying" | "gone";

/* A file you can pick up and drop on the zone, so the demo works without
   hunting for something on the desktop. Dragging is pointer-driven (mouse,
   pen and touch) and draws its own macOS-style drag image: the file chip,
   an arrow cursor and the green "copy" badge. */
export function DemoFile({ zone, available }: { zone: RefObject<DropZoneHandle | null>; available: boolean }) {
  const [mode, setMode] = useState<Mode>("rest");
  const [overZone, setOverZone] = useState(false);
  const restRef = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const flights = useRef<AnimationPlaybackControls[]>([]);

  /* the drag image's anchor is the cursor tip */
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const gScale = useMotionValue(1);
  const gOpacity = useMotionValue(1);

  /* the file reappears once the upload has finished and the zone is ready */
  useEffect(() => {
    if (mode === "gone" && available) setMode("rest");
  }, [mode, available]);

  useEffect(() => () => {
    flights.current.forEach((f) => f.stop());
    document.documentElement.classList.remove("carrying-file");
  }, []);

  const restCenter = () => {
    const r = restRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  };

  const pickUp = (x: number, y: number) => {
    flights.current.forEach((f) => f.stop());
    gx.set(x);
    gy.set(y);
    gScale.set(1);
    gOpacity.set(1);
    setMode("dragging");
  };

  const move = (x: number, y: number) => {
    gx.set(x);
    gy.set(y);
    setOverZone(zone.current?.dragMove(x, y) ?? false);
  };

  const putDown = (x: number, y: number) => {
    document.documentElement.classList.remove("carrying-file");
    setOverZone(false);
    const taken = zone.current?.dragEnd(x, y) ?? false;
    setMode("flying");
    if (taken) {
      /* swallowed: the drag image is pulled into the hole */
      const c = zone.current?.center() ?? { x, y };
      const ease = [0.55, 0, 0.9, 0.45] as const;
      flights.current = [
        animate(gx, c.x, { duration: 0.34, ease }),
        animate(gy, c.y, { duration: 0.34, ease }),
        animate(gScale, 0.15, { duration: 0.34, ease }),
        animate(gOpacity, 0, { duration: 0.34, ease: "easeIn", onComplete: () => setMode("gone") }),
      ];
    } else {
      /* missed: it slides back to where it was picked up */
      const home = restCenter();
      flights.current = [
        animate(gx, home.x, { type: "spring", visualDuration: 0.4, bounce: 0.2 }),
        animate(gy, home.y, { type: "spring", visualDuration: 0.4, bounce: 0.2 }),
        animate(gOpacity, 0, { duration: 0.3, delay: 0.15, onComplete: () => setMode("rest") }),
      ];
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (mode !== "rest" || !available || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    if (mode === "rest") {
      /* a few pixels of travel before it counts as a drag, so a stray click does nothing */
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 4) return;
      document.documentElement.classList.add("carrying-file");
      pickUp(e.clientX, e.clientY);
    }
    move(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    if (mode === "dragging") putDown(e.clientX, e.clientY);
  };

  /* keyboard: Enter or Space plays the drag for you */
  const autoplay = () => {
    const c = zone.current?.center();
    if (!c || mode !== "rest" || !available) return;
    const from = restCenter();
    const xs = [from.x, c.x - 210, c.x - 40, c.x + 120, c.x + 135, c.x - 90, c.x + 30, c.x + 10];
    const ys = [from.y, c.y - 40, c.y + 10, c.y + 60, c.y - 70, c.y - 30, c.y + 75, c.y + 5];
    pickUp(from.x, from.y);
    const opts = { duration: 4.2, ease: "easeInOut" as const };
    flights.current = [
      animate(gx, xs, { ...opts, onUpdate: () => move(gx.get(), gy.get()) }),
      animate(gy, ys, { ...opts, onComplete: () => putDown(gx.get(), gy.get()) }),
    ];
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      autoplay();
    }
  };

  const carrying = mode === "dragging" || mode === "flying";

  return (
    <>
      <div className="flex items-center gap-3">
        <motion.button
          ref={restRef}
          type="button"
          aria-label={`Demo file "${NAME}". Drag it onto the drop zone, or press Enter to play the drag.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onDragStart={(e) => e.preventDefault()}
          initial={false}
          animate={
            mode === "gone"
              ? { opacity: 0, scale: 0.6 }
              : carrying
                ? { opacity: 0.45, scale: 1 }
                : { opacity: 1, scale: 1 }
          }
          whileHover={mode === "rest" ? { y: -2 } : undefined}
          transition={{ type: "spring", visualDuration: 0.35, bounce: 0.3 }}
          className="group flex touch-none cursor-grab select-none flex-col items-center gap-1.5 rounded-lg p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:cursor-grabbing"
        >
          <FileThumb className="h-[44px] w-[52px]" iconSize={22} />
          <Label className="text-[12px]">{NAME}</Label>
        </motion.button>
        <AnimatePresence initial={false}>
          {mode === "rest" && (
            <motion.p
              key="hint"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="max-w-[9rem] text-[12px] leading-snug text-[var(--dz-hint)]"
            >
              Drag this file onto the drop zone
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {carrying &&
        createPortal(
          <motion.div
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-[100]"
            style={{ x: gx, y: gy, scale: gScale, opacity: gOpacity }}
          >
            {/* the chip sits up and to the left of the cursor tip */}
            <div className="absolute right-[3px] top-[-14px] flex items-center gap-1">
              <FileThumb className="h-[14px] w-[17px]" iconSize={9} thin />
              <Label className="text-[12px]">{NAME}</Label>
            </div>
            <ArrowCursor />
            <motion.span
              className="absolute left-[9px] top-[15px] grid size-[21px] place-items-center rounded-full border-[1.5px] border-white bg-[#29c246] shadow-[0_1px_3px_rgb(0_0_0/0.4)]"
              animate={{ scale: overZone ? 1 : 0.85 }}
              transition={{ type: "spring", visualDuration: 0.25, bounce: 0.5 }}
            >
              <svg viewBox="0 0 12 12" className="size-[11px]" aria-hidden>
                <path d="M6 1.5v9M1.5 6h9" stroke="white" strokeWidth={2.4} strokeLinecap="round" />
              </svg>
            </motion.span>
          </motion.div>,
          document.body,
        )}
    </>
  );
}

function FileThumb({ className, iconSize, thin }: { className: string; iconSize: number; thin?: boolean }) {
  return (
    <span
      className={
        "grid place-items-center bg-gradient-to-br from-[#f6c27a] via-[#e39a52] to-[#a8603a] text-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] " +
        (thin ? "rounded-[2px] border border-white" : "rounded-[4px] border-2 border-white") +
        " " +
        className
      }
    >
      <Dog style={{ width: iconSize, height: iconSize }} strokeWidth={thin ? 2.5 : 2} />
    </span>
  );
}

function Label({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={"whitespace-nowrap rounded-[4px] bg-[#1d5be0] px-1.5 py-px font-medium leading-[1.35] text-white " + className}
    >
      {children}
    </span>
  );
}

/* the classic arrow, tip at the element's origin */
function ArrowCursor() {
  return (
    <svg width="17" height="25" viewBox="0 0 17 25" className="absolute left-[-1px] top-[-1px] drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.45)]">
      <path d="M1 1v19.5l4.6-4.4 3.1 7.2 3.2-1.4-3.1-7.1h6.4L1 1z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}
