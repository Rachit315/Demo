import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { fade, morph } from "./motion";

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

/* specks thrown out of the button when a swap lands */
const burst = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const reach = 1 + (i % 3) * 0.22;
  return { x: Math.cos(angle) * 190 * reach, y: Math.sin(angle) * 44 * reach, size: 3 + (i % 3) };
});

type Ripple = { id: number; x: number; y: number };

/* kept light: a thin inner highlight and a short, soft drop */
const restShadow =
  "inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -1px 2px rgb(10 40 160 / 0.2), 0 3px 8px -4px rgb(47 100 245 / 0.35)";
const hoverShadow =
  "inset 0 1px 0 rgb(255 255 255 / 0.36), inset 0 -1px 2px rgb(10 40 160 / 0.2), 0 4px 12px -5px rgb(47 100 245 / 0.45)";

export function LiquidButton({
  children,
  disabled,
  busy,
  success,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  busy: boolean;
  success: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [hover, setHover] = useState(false);
  const [bursts, setBursts] = useState(0);
  const nextId = useRef(0);

  /* a soft highlight that follows the pointer across the glass */
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const glow = useMotionTemplate`radial-gradient(110px circle at ${mx}px ${my}px, rgb(255 255 255 / 0.28), transparent 70%)`;

  useEffect(() => {
    if (success && !reduce) setBursts((n) => n + 1);
  }, [success, reduce]);

  const interactive = !disabled && !busy;

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    const r = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((list) => [...list, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  const handleClick = () => {
    if (busy) return;
    if (disabled) {
      /* a quick "no" shake instead of a dead click */
      if (!reduce) animate(scope.current, { x: [0, -7, 7, -5, 5, -2, 0] }, { duration: 0.42, ease: "easeOut" });
      return;
    }
    onClick();
  };

  return (
    <div ref={scope} className="relative mt-0.5">
      {/* success: a ring pulses out and specks fly from the centre */}
      {bursts > 0 && (
        <span key={bursts} aria-hidden className="pointer-events-none absolute inset-0">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-[#4d82ff]"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.16 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <span className="absolute left-1/2 top-1/2">
            {burst.map((b, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: b.size,
                  height: b.size,
                  marginLeft: -b.size / 2,
                  marginTop: -b.size / 2,
                  background: i % 2 ? "#7cc8ff" : "#4d82ff",
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </span>
        </span>
      )}

      <motion.button
        type="button"
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        aria-disabled={disabled || busy}
        aria-busy={busy}
        animate={{
          filter: disabled ? "saturate(0.25) brightness(1.08)" : "saturate(1) brightness(1)",
          boxShadow: hover && interactive ? hoverShadow : restShadow,
        }}
        transition={{ type: "spring", visualDuration: 0.25, bounce: 0.3 }}
        className={
          "relative h-[46px] w-full overflow-hidden rounded-full text-[15px] font-normal text-white outline-none focus-visible:ring-2 focus-visible:ring-sw-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sw-page " +
          (disabled ? "cursor-not-allowed" : busy ? "cursor-progress" : "cursor-pointer")
        }
        style={{ background: "linear-gradient(180deg, #4d82ff 0%, #2f64f5 100%)", boxShadow: restShadow }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen">
          {blobs.map((b, i) => (
            <motion.span
              /* re-keyed on busy so the new pace takes effect at once */
              key={`${i}-${busy}`}
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
              transition={{
                duration: busy ? b.dur / 3 : b.dur,
                delay: busy ? i * -0.4 : b.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
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

        {/* pointer-follow highlight */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: glow }}
          initial={false}
          animate={{ opacity: hover && interactive ? 1 : 0 }}
          transition={fade()}
        />

        {/* loading: a glossy band sweeps across while the swap is in flight */}
        <AnimatePresence>
          {busy && !success && (
            <motion.span
              key="sweep"
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12"
              style={{ background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.38), transparent)" }}
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "320%", opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ x: { duration: 1, repeat: Infinity, ease: "easeInOut" }, opacity: fade() }}
            />
          )}
        </AnimatePresence>

        {/* click ripples, spreading from where the pointer landed */}
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute size-5 rounded-full"
            style={{
              left: r.x - 10,
              top: r.y - 10,
              background: "radial-gradient(closest-side, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0))",
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 34, opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
          />
        ))}

        <motion.span
          className="relative block"
          initial={false}
          animate={{ scale: success ? [1, 1.08, 1] : 1 }}
          transition={success ? { duration: 0.45, ease: "easeOut" } : morph}
        >
          {children}
        </motion.span>
      </motion.button>
    </div>
  );
}
