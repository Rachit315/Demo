import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type Transition } from "motion/react";
import { Mosaic } from "./Mosaic";

/* one spring language across the page, same family as the card's morph */
const spring: Transition = { type: "spring", visualDuration: 0.6, bounce: 0.18 };
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { ...spring, delay },
});

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-forah", label: "Why Förah" },
  { href: "#explore", label: "Explore" },
];

/* four corner brackets, the mark next to the wordmark */
function LogoMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-[13px]" fill="none" aria-hidden>
      <path
        d="M2 6V3.5A1.5 1.5 0 0 1 3.5 2H6M10 2h2.5A1.5 1.5 0 0 1 14 3.5V6M14 10v2.5a1.5 1.5 0 0 1-1.5 1.5H10M6 14H3.5A1.5 1.5 0 0 1 2 12.5V10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrimaryButton({ children, size = "sm" }: { children: ReactNode; size?: "sm" | "md" }) {
  return (
    <motion.a
      href="#athletes"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: "spring", visualDuration: 0.25, bounce: 0.3 }}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[3px] bg-accent font-semibold text-[#0f0f12] transition-colors duration-200 hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        size === "sm" ? "h-[23px] px-[14px] text-[11.5px]" : "h-[25px] px-4 text-[12px]"
      }`}
    >
      {children}
    </motion.a>
  );
}

function GhostButton({ children, size = "sm" }: { children: ReactNode; size?: "sm" | "md" }) {
  return (
    <motion.a
      href="#brands"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: "spring", visualDuration: 0.25, bounce: 0.3 }}
      className={`inline-flex items-center justify-center rounded-full border border-white/85 font-semibold text-white transition-colors duration-200 hover:border-white hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        size === "sm" ? "h-[23px] px-[14px] text-[11.5px]" : "h-[25px] px-4 text-[12px]"
      }`}
    >
      {children}
    </motion.a>
  );
}

function Nav() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-[14px]"
    >
      <nav className="flex items-center gap-3 sm:gap-4">
        <a
          href="#top"
          className="flex items-center gap-1 text-[14px] font-medium tracking-[-0.01em] text-white"
          aria-label="Förah home"
        >
          <span className="text-accent">
            <LogoMark />
          </span>
          Förah
        </a>

        <ul className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((link) => (
            <li key={link.href} className="relative">
              {hovered === link.href && (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-full bg-white/[0.07]"
                  transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
                />
              )}
              <a
                href={link.href}
                onMouseEnter={() => setHovered(link.href)}
                onFocus={() => setHovered(link.href)}
                className="relative block rounded-full px-2 py-1 text-[11.5px] text-[#a3a3a8] transition-colors duration-200 hover:text-white focus-visible:text-white focus-visible:outline-none"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 sm:ml-1">
          <PrimaryButton>I’m an athlete</PrimaryButton>
          <GhostButton>I’m a brand</GhostButton>
        </div>
      </nav>
    </motion.header>
  );
}

/* "99%" counts up; an invisible copy holds the final width so the
   centred line never shifts while the digits change */
function CountUp({ to, delay }: { to: number; delay: number }) {
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay });
    return () => controls.stop();
  }, [to, delay, value]);

  return (
    <span className="inline-grid text-accent tabular-nums">
      <span className="invisible col-start-1 row-start-1">{to}%</span>
      <motion.span className="col-start-1 row-start-1 text-center">{text}</motion.span>
    </span>
  );
}

function Headline() {
  const words: { node: ReactNode; key: string }[] = [
    { key: "where", node: "Where" },
    { key: "the", node: "the" },
    { key: "99", node: <CountUp to={99} delay={0.55} /> },
  ];
  const second = ["gets", "sponsored"];

  const word = (node: ReactNode, key: string, i: number) => (
    <motion.span
      key={key}
      className="inline-block"
      initial={{ opacity: 0, y: "0.45em", filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: 0.25 + i * 0.07 }}
    >
      {node}
    </motion.span>
  );

  return (
    <h1 className="text-balance text-center text-[clamp(2.4rem,4.75vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.025em] text-[#ededee]">
      <span className="flex flex-wrap justify-center gap-x-[0.24em]">
        {words.map((w, i) => word(w.node, w.key, i))}
      </span>
      <span className="flex flex-wrap justify-center gap-x-[0.24em]">
        {second.map((w, i) => word(w, w, i + words.length))}
      </span>
    </h1>
  );
}

/* the dotted field, plus a brighter copy revealed under the cursor */
function DotField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${e.clientX}px`);
        el.style.setProperty("--my", `${e.clientY}px`);
        el.style.opacity = "1";
      });
    };
    const onLeave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <motion.div
        aria-hidden
        className="dot-field absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
      <div
        ref={ref}
        aria-hidden
        className="dot-field dot-field--lit pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
      />
    </>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-hero">
      <DotField />
      <Nav />

      {/* artwork: pixel squares on the left, dots on the right, both
          anchored to the bottom edge and meeting in the middle */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end">
        <Mosaic variant="squares" seed={11} className="w-1/2" />
        <Mosaic variant="dots" seed={29} className="w-1/2" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-[18vh] pt-28 sm:pb-[12vh]">
        <Headline />

        <motion.p
          {...rise(0.75)}
          className="mt-4 text-center text-[11.5px] leading-[1.25] text-[#a6a6ab]"
        >
          Athlete sponsorships
          <br />
          that actually work
        </motion.p>

        <motion.div {...rise(0.85)} className="mt-[22px] flex items-center gap-[5px]">
          <PrimaryButton size="md">I’m an athlete</PrimaryButton>
          <GhostButton size="md">I’m a brand</GhostButton>
        </motion.div>
      </div>
    </section>
  );
}
