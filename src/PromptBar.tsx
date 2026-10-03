import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from "motion/react";
import { Check, CornerDownLeft } from "lucide-react";
import { sounds } from "./sounds";

/* the same spring the voice card morphs on, so both blocks feel related */
const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
const snappy: Transition = { type: "spring", visualDuration: 0.28, bounce: 0.3 };

const SUGGESTIONS = [
  "Brand Intelligence",
  "Visual Identity",
  "Motion Language",
  "Campaign Assets",
  "Design Tokens",
  "Product Story",
];

const GENERATE_MS = 1900;
const READY_MS = 2200;
const MAX_PARTICLES = 48;

type Phase = "idle" | "generating" | "done";

type Particle = { id: number; x: number; y: number; dx: number; dy: number; size: number; dur: number };

type PromptBarProps = {
  energy: MotionValue<number>;
  focus: MotionValue<number>;
};

export function PromptBar({ energy, focus }: PromptBarProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ghost, setGhost] = useState<{ id: number; text: string } | null>(null);
  const [sweep, setSweep] = useState(0);
  /* background-clip:text keeps the fallback-font paint after the web font
     swaps in, so the gradient text is remounted once fonts are ready */
  const [fontsReady, setFontsReady] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const particleId = useRef(0);
  const energyAnim = useRef<AnimationPlaybackControls>(undefined);
  const timers = useRef<number[]>([]);
  const lastKeySound = useRef(0);

  const empty = value.length === 0;
  const suggestion = useTypewriter(SUGGESTIONS, empty && phase === "idle" && !reduce);

  /* caret position inside the bar, in px; the glow trails it on a softer spring */
  const caretX = useMotionValue(0);
  const caretSmooth = useSpring(caretX, { stiffness: 900, damping: 55 });
  const glowX = useSpring(caretX, { stiffness: 170, damping: 24 });
  const barH = useMotionValue(100);

  useEffect(() => {
    animate(focus, focused ? 1 : 0, { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] });
  }, [focused, focus]);

  /* where the caret sits: field offset + width of the text before it − scroll */
  const measure = useCallback(() => {
    const field = fieldRef.current;
    const input = inputRef.current;
    const m = measureRef.current;
    const bar = barRef.current;
    if (!field || !input || !m || !bar) return;
    const pad = parseFloat(getComputedStyle(input).paddingLeft) || 0;
    const scroll = input.scrollLeft;
    if (mirrorRef.current) mirrorRef.current.style.transform = `translateX(${-scroll}px)`;
    caretX.set(field.offsetLeft + pad + m.getBoundingClientRect().width - scroll);
    barH.set(bar.offsetHeight);
  }, [caretX, barH]);

  useLayoutEffect(measure, [measure, value, caret, phase]);

  useEffect(() => {
    /* first paint: jump straight there, no spring in from x = 0 */
    measure();
    caretSmooth.jump(caretX.get());
    glowX.jump(caretX.get());
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    /* the font loads after first paint and changes every width */
    document.fonts?.ready.then(() => {
      setFontsReady(true);
      measure();
    });
    return () => ro.disconnect();
  }, [measure, caretSmooth, glowX, caretX]);

  /* the input's own scroll settles a frame after typing; follow it */
  const syncCaret = () => {
    const input = inputRef.current;
    if (!input) return;
    setCaret(input.selectionDirection === "backward" ? input.selectionStart ?? 0 : input.selectionEnd ?? 0);
    requestAnimationFrame(measure);
  };

  useEffect(() => {
    const on = () => document.activeElement === inputRef.current && syncCaret();
    document.addEventListener("selectionchange", on);
    return () => document.removeEventListener("selectionchange", on);
  });

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  /* each keystroke kicks the glow up, then it bleeds back down */
  const pump = (amount: number, hold = 0.12) => {
    energyAnim.current?.stop();
    const from = energy.get();
    const peak = Math.min(1, from + amount);
    energyAnim.current = animate(energy, [from, peak, peak, 0], {
      duration: 1.5 + hold,
      times: [0, 0.07, 0.07 + hold / (1.5 + hold), 1],
      ease: ["easeOut", "linear", [0.3, 0, 0.2, 1]],
    });
  };

  const emit = (n: number, spread = 1) => {
    if (reduce) return;
    const x = caretX.get();
    const h = barH.get();
    const fresh: Particle[] = Array.from({ length: n }, () => ({
      id: particleId.current++,
      x: x + (Math.random() - 0.3) * 8,
      y: h / 2 + (Math.random() - 0.5) * h * 0.35,
      dx: (14 + Math.random() * 70) * spread,
      dy: (Math.random() - 0.5) * h * 0.7 * spread,
      size: 1.5 + Math.random() * 2,
      dur: 0.7 + Math.random() * 0.8,
    }));
    setParticles((p) => [...p, ...fresh].slice(-MAX_PARTICLES));
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const submit = () => {
    if (phase !== "idle") return;
    const text = value.trim() || suggestion.full;
    if (!text) return;
    sounds.submit();
    setPrompt(text);
    setGhost({ id: Date.now(), text: value || suggestion.text });
    setValue("");
    setCaret(0);
    setPhase("generating");
    setSweep((s) => s + 1);
    pump(1, 0.9);
    emit(16, 1.6);
    later(() => {
      setPhase("done");
      setRecent((r) => [text, ...r.filter((t) => t !== text)].slice(0, 4));
      sounds.done();
      pump(0.6);
    }, GENERATE_MS);
    later(() => {
      setPhase("idle");
      inputRef.current?.focus({ preventScroll: true });
    }, GENERATE_MS + READY_MS);
  };

  const accept = () => {
    const full = suggestion.full;
    setValue(full);
    setCaret(full.length);
    sounds.tick();
    pump(0.5);
    emit(6);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.setSelectionRange(full.length, full.length);
      input.scrollLeft = input.scrollWidth;
      measure();
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    const grew = next.length > value.length;
    setValue(next);
    syncCaret();
    const now = performance.now();
    if (now - lastKeySound.current > 45) {
      sounds.key();
      lastKeySound.current = now;
    }
    pump(grew ? 0.32 : 0.14);
    if (grew) requestAnimationFrame(() => emit(2 + Math.round(Math.random() * 2)));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (empty && phase === "idle" && (e.key === "Tab" || e.key === "ArrowRight") && !e.shiftKey) {
      e.preventDefault();
      accept();
    } else if (e.key === "Escape" && !empty) {
      e.preventDefault();
      setValue("");
      setCaret(0);
      pump(0.2);
    }
  };

  const busy = phase !== "idle";

  /* glow strength: resting → focused → typing */
  const glowOpacity = useTransform(() => 0.68 + focus.get() * 0.17 + energy.get() * 0.3);
  const glowScaleX = useTransform(() => 1 + energy.get() * 0.28);
  const glowScaleY = useTransform(() => 1 + energy.get() * 0.12);
  const coreOpacity = useTransform(() => 0.4 + focus.get() * 0.2 + energy.get() * 0.4);
  const caretGlow = useTransform(
    () => `0 0 ${10 + energy.get() * 14}px rgb(255 30 30 / ${0.55 + energy.get() * 0.4})`,
  );

  return (
    <div className="flex w-full flex-col items-center">
      <motion.div
        ref={barRef}
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...morph, filter: { duration: 0.6 } }}
        onPointerDown={(e) => {
          /* clicking anywhere on the bar puts you in the field */
          if (e.target === inputRef.current || (e.target as Element).closest("button")) return;
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className="prompt-bar relative isolate flex w-full cursor-text items-center"
      >
        {/* glow lives behind the text and is allowed to bleed past the bar */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-10" style={{ x: glowX }}>
          <motion.div
            className="absolute left-[calc(var(--h)*-0.35)] top-1/2 h-[calc(var(--h)*1.45)] w-[calc(var(--h)*3.6)] -translate-y-1/2"
            style={{
              opacity: glowOpacity,
              scaleX: glowScaleX,
              scaleY: glowScaleY,
              originX: 0.12,
              background:
                "radial-gradient(ellipse 50% 50% at 42% 50%, rgb(205 14 14 / 0.95) 0%, rgb(150 0 0 / 0.6) 34%, rgb(90 0 0 / 0.22) 62%, transparent 78%)",
            }}
          />
          <motion.div
            className="absolute left-[calc(var(--h)*-0.05)] top-1/2 h-[calc(var(--h)*0.85)] w-[calc(var(--h)*1.7)] -translate-y-1/2 mix-blend-screen"
            style={{
              opacity: coreOpacity,
              background:
                "radial-gradient(ellipse 50% 50% at 40% 50%, rgb(255 190 190 / 0.6) 0%, rgb(255 70 70 / 0.35) 38%, transparent 72%)",
            }}
          />
          {!reduce && <Embers />}
        </motion.div>

        {/* the pill itself: solid on the left, dissolving to the right */}
        <div aria-hidden className="prompt-surface pointer-events-none absolute inset-0 -z-20" />

        <PlusButton busy={busy} onClick={submit} />

        <span className="ml-[calc(var(--h)*0.2)] shrink-0 select-none text-[length:var(--fs)] font-normal tracking-[-0.015em] text-white">
          Create
        </span>

        <div
          ref={fieldRef}
          className="relative ml-[calc(var(--h)*0.2)] h-full min-w-0 flex-1 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, black 0%, black 72%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 0%, black 72%, transparent 100%)",
          }}
        >
          {/* what you see: gradient text mirroring the real input */}
          <div ref={mirrorRef} aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
            {/* the suggestion is dimmed through its gradient: opacity on a
                background-clip:text span inside a mask drops it in Chromium */}
            <span
              key={fontsReady ? "ready" : "loading"}
              className={"prompt-text prompt-gradient whitespace-pre pl-[0.3em] " + (value ? "" : "prompt-gradient-dim")}
            >
              {value || (busy ? "" : suggestion.text)}
            </span>
          </div>

          {/* measuring stick: same font, only the text before the caret */}
          <span
            ref={measureRef}
            aria-hidden
            className="prompt-text pointer-events-none invisible absolute left-0 top-0 whitespace-pre"
          >
            {value.slice(0, caret)}
          </span>

          <AnimatePresence>
            {ghost && (
              <motion.div
                key={ghost.id}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
                initial={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                animate={{ opacity: 0, x: 60, filter: "blur(10px)" }}
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                onAnimationComplete={() => setGhost(null)}
              >
                <span className="prompt-text prompt-gradient whitespace-pre pl-[0.3em]">{ghost.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onSelect={syncCaret}
            onScroll={measure}
            onFocus={() => {
              setFocused(true);
              syncCaret();
            }}
            onBlur={() => setFocused(false)}
            readOnly={busy}
            maxLength={120}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            enterKeyHint="go"
            aria-label="What do you want to create?"
            aria-describedby="prompt-status"
            placeholder=""
            className="prompt-text prompt-input absolute inset-0 h-full w-full bg-transparent pl-[0.3em] pr-[28%] text-transparent caret-transparent outline-none"
          />
        </div>

        {/* custom caret */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 -ml-px h-[calc(var(--h)*0.6)] w-[3px] -translate-y-1/2 rounded-full bg-[#ff1f1f]"
          style={{ x: caretSmooth, boxShadow: caretGlow }}
          animate={
            busy
              ? { opacity: [1, 0.25, 1], scaleY: [1, 0.7, 1] }
              : focused
                ? { opacity: [1, 1, 0, 0, 1], scaleY: 1 }
                : { opacity: 0.85, scaleY: 1 }
          }
          transition={
            busy
              ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
              : focused
                ? { duration: 1.05, repeat: Infinity, times: [0, 0.5, 0.55, 0.95, 1], ease: "linear" }
                : { duration: 0.3 }
          }
        />

        {/* one-shot light sweep on submit */}
        <AnimatePresence>
          {sweep > 0 && phase === "generating" && (
            <motion.div
              key={sweep}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-l-full"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              <motion.div
                className="absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgb(255 80 80 / 0.22) 45%, rgb(255 220 220 / 0.35) 50%, rgb(255 80 80 / 0.22) 55%, transparent)",
                }}
                initial={{ left: "-35%" }}
                animate={{ left: "110%" }}
                transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* sparks thrown off the caret while typing */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute left-0 top-0 rounded-full bg-[#ff3b3b]"
              style={{ width: p.size, height: p.size, boxShadow: "0 0 6px rgb(255 40 40 / 0.9)" }}
              initial={{ x: p.x, y: p.y, opacity: 0.95, scale: 1 }}
              animate={{ x: p.x + p.dx, y: p.y + p.dy, opacity: 0, scale: 0.3 }}
              transition={{ duration: p.dur, ease: [0.2, 0.6, 0.3, 1] }}
              onAnimationComplete={() => setParticles((all) => all.filter((q) => q.id !== p.id))}
            />
          ))}
        </div>
      </motion.div>

      <Status phase={phase} prompt={prompt} empty={empty} />

      <Recent
        items={recent}
        disabled={busy}
        onPick={(t) => {
          setValue(t);
          setCaret(t.length);
          sounds.tick();
          pump(0.45);
          const input = inputRef.current;
          input?.focus();
          requestAnimationFrame(() => {
            input?.setSelectionRange(t.length, t.length);
            if (input) input.scrollLeft = input.scrollWidth;
            measure();
          });
        }}
      />
    </div>
  );
}

function PlusButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Create"
      disabled={busy}
      onClick={onClick}
      whileHover={busy ? undefined : { rotate: 90, scale: 1.08 }}
      whileTap={busy ? undefined : { scale: 0.86 }}
      animate={busy ? { rotate: [0, 180, 360] } : { rotate: 0 }}
      transition={busy ? { duration: 1.1, repeat: Infinity, ease: "linear" } : snappy}
      className="relative ml-[calc(var(--h)*0.36)] grid size-[calc(var(--h)*0.42)] shrink-0 cursor-pointer place-items-center rounded-full text-[#ff1414] outline-none focus-visible:ring-2 focus-visible:ring-[#ff1414]/60 disabled:cursor-progress"
    >
      <svg viewBox="0 0 24 24" className="size-[78%]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="butt">
        <path d="M12 1.5v21M1.5 12h21" />
      </svg>
    </motion.button>
  );
}

function Status({ phase, prompt, empty }: { phase: Phase; prompt: string; empty: boolean }) {
  return (
    <div
      id="prompt-status"
      role="status"
      aria-live="polite"
      className="relative mt-7 flex h-8 w-full items-center justify-center text-[13px] text-neutral-400"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={morph}
            className="flex items-center gap-3 text-neutral-500"
          >
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeft className="size-3" strokeWidth={2.25} />
              </Kbd>
              to create
            </span>
            {empty && (
              <span className="hidden items-center gap-1.5 sm:flex">
                <Kbd>Tab</Kbd>
                use suggestion
              </span>
            )}
          </motion.div>
        )}
        {phase === "generating" && (
          <motion.div
            key="gen"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={morph}
            className="flex flex-col items-center gap-2"
          >
            <span className="flex items-center gap-2 text-neutral-300">
              Generating <span className="text-white">{prompt}</span>
              <Dots />
            </span>
            <span className="h-px w-40 overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full origin-left bg-gradient-to-r from-[#7a0000] via-[#ff1f1f] to-[#ff8a8a]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: GENERATE_MS / 1000, ease: [0.3, 0, 0.2, 1] }}
              />
            </span>
          </motion.div>
        )}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={snappy}
            className="flex items-center gap-2 text-neutral-300"
          >
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...snappy, delay: 0.05 }}
              className="grid size-5 place-items-center rounded-full bg-[#ff1f1f] text-black"
            >
              <Check className="size-3" strokeWidth={3} />
            </motion.span>
            <span>
              <span className="text-white">{prompt}</span> is ready
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Recent({ items, disabled, onPick }: { items: string[]; disabled: boolean; onPick: (t: string) => void }) {
  return (
    <motion.ul layout className="mt-4 flex min-h-9 flex-wrap items-center justify-center gap-2" aria-label="Recently created">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((t) => (
          <motion.li
            key={t}
            layout
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={morph}
          >
            <motion.button
              type="button"
              disabled={disabled}
              onClick={() => onPick(t)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={snappy}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-neutral-300 backdrop-blur-sm transition-colors hover:border-[#ff1f1f]/40 hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff1f1f]/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="size-1.5 rounded-full bg-[#ff1f1f] shadow-[0_0_8px_#ff1f1f]" />
              {t}
            </motion.button>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded-[5px] border border-white/10 bg-white/[0.05] px-1 font-sans text-[11px] text-neutral-400">
      {children}
    </kbd>
  );
}

function Dots() {
  return (
    <span className="flex gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-[3px] rounded-full bg-[#ff3b3b]"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/* the tiny specks floating in the light, like dust in a beam */
const EMBERS = [
  { x: 0.55, y: 0.18, d: 3.2 },
  { x: 1.1, y: 0.82, d: 4.1 },
  { x: 0.2, y: 0.9, d: 3.6 },
  { x: 1.6, y: 0.3, d: 4.6 },
  { x: 0.85, y: 0.62, d: 3.9 },
  { x: 2.0, y: 0.7, d: 5.2 },
];

function Embers() {
  return (
    <>
      {EMBERS.map((e, i) => (
        <motion.span
          key={i}
          className="absolute size-[2px] rounded-full bg-[#ff4d4d]"
          style={{ left: `calc(var(--h) * ${e.x})`, top: `${e.y * 100}%` }}
          animate={{ x: [0, 14, 0], y: [0, -8, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: e.d, repeat: Infinity, delay: i * 0.45, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/* types a suggestion out, holds it, erases it, moves to the next */
function useTypewriter(words: string[], running: boolean) {
  const [index, setIndex] = useState(0);
  /* starts empty so the first suggestion types itself in on load */
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"hold" | "erase" | "type">("type");

  useEffect(() => {
    if (!running) return;
    const word = words[index];
    let id: number;
    if (mode === "hold") {
      id = window.setTimeout(() => setMode("erase"), 2400);
    } else if (mode === "erase") {
      if (text.length === 0) {
        setIndex((i) => (i + 1) % words.length);
        setMode("type");
        return;
      }
      id = window.setTimeout(() => setText(text.slice(0, -1)), 32);
    } else {
      if (text === word) {
        setMode("hold");
        return;
      }
      /* a beat before the very first word, so the bar lands before typing */
      const wait = text === "" && index === 0 ? 650 : 55 + Math.random() * 50;
      id = window.setTimeout(() => setText(word.slice(0, text.length + 1)), wait);
    }
    return () => window.clearTimeout(id);
  }, [running, mode, text, index, words]);

  /* when paused mid-word, show the whole word rather than a fragment */
  return { text: running ? text : words[index], full: words[index] };
}
