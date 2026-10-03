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
import {
  ArrowUp,
  AudioLines,
  Brain,
  FileText,
  ImagePlus,
  Mic,
  Paperclip,
  Plus,
  Square,
  Telescope,
  X,
} from "lucide-react";
import { sounds } from "./sounds";
import type { Tool } from "./replies";

/* the same spring the voice card morphs on, so every block feels related */
export const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
const snappy: Transition = { type: "spring", visualDuration: 0.26, bounce: 0.3 };

const MAX_PARTICLES = 36;

type Attachment = { id: number; name: string; url?: string };
type Particle = { id: number; x: number; y: number; dx: number; dy: number; size: number; dur: number };

export type SendPayload = { text: string; think: boolean; tool: Tool; files: string[] };

type ComposerProps = {
  energy: MotionValue<number>;
  focus: MotionValue<number>;
  /* the assistant is replying: the send button becomes stop */
  busy: boolean;
  onSend: (payload: SendPayload) => void;
  onStop: () => void;
};

export function Composer({ energy, focus, busy, onSend, onStop }: ComposerProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const [think, setThink] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [notice, setNotice] = useState("");
  /* background-clip:text keeps the fallback-font paint after the web font
     swaps in, so the gradient text is remounted once fonts are ready */
  const [fontsReady, setFontsReady] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const particleId = useRef(0);
  const fileId = useRef(0);
  const energyAnim = useRef<AnimationPlaybackControls>(undefined);
  const lastKeySound = useRef(0);
  const noticeTimer = useRef<number>(undefined);

  const empty = value.trim().length === 0;
  const canSend = !empty || files.length > 0;

  const say = (msg: string) => {
    setNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 4200);
  };

  /* ── caret tracking ───────────────────────────────────────────────── */

  const caretX = useMotionValue(0);
  const caretSmooth = useSpring(caretX, { stiffness: 900, damping: 55 });
  const glowX = useSpring(caretX, { stiffness: 170, damping: 24 });
  const rowH = useMotionValue(56);

  useEffect(() => {
    animate(focus, focused ? 1 : 0, { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] });
  }, [focused, focus]);

  /* where the caret sits: field offset + width of the text before it − scroll */
  const measure = useCallback(() => {
    const field = fieldRef.current;
    const input = inputRef.current;
    const m = measureRef.current;
    const row = rowRef.current;
    if (!field || !input || !m || !row) return;
    const pad = parseFloat(getComputedStyle(input).paddingLeft) || 0;
    const scroll = input.scrollLeft;
    if (mirrorRef.current) mirrorRef.current.style.transform = `translateX(${-scroll}px)`;
    caretX.set(field.offsetLeft + pad + m.getBoundingClientRect().width - scroll);
    rowH.set(row.offsetHeight);
  }, [caretX, rowH]);

  useLayoutEffect(measure, [measure, value, caret, files.length, tool]);

  useEffect(() => {
    measure();
    caretSmooth.jump(caretX.get());
    glowX.jump(caretX.get());
    const ro = new ResizeObserver(measure);
    if (rowRef.current) ro.observe(rowRef.current);
    document.fonts?.ready.then(() => {
      setFontsReady(true);
      measure();
    });
    return () => ro.disconnect();
  }, [measure, caretSmooth, glowX, caretX]);

  const syncCaret = () => {
    const input = inputRef.current;
    if (!input) return;
    setCaret(input.selectionDirection === "backward" ? (input.selectionStart ?? 0) : (input.selectionEnd ?? 0));
    requestAnimationFrame(measure);
  };

  useEffect(() => {
    const on = () => document.activeElement === inputRef.current && syncCaret();
    document.addEventListener("selectionchange", on);
    return () => document.removeEventListener("selectionchange", on);
  });

  /* desktop: start in the field; press "/" anywhere to jump back to it */
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(noticeTimer.current);
    };
  }, []);

  /* ── glow energy ──────────────────────────────────────────────────── */

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

  /* while the assistant writes, the light breathes */
  useEffect(() => {
    if (!busy || reduce) return;
    energyAnim.current?.stop();
    energyAnim.current = animate(energy, [energy.get(), 0.55, 0.2, 0.55], {
      duration: 2.4,
      times: [0, 0.2, 0.6, 1],
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "mirror",
    });
    return () => {
      energyAnim.current?.stop();
      animate(energy, 0, { duration: 0.8 });
    };
  }, [busy, energy, reduce]);

  const emit = (n: number, spread = 1) => {
    if (reduce) return;
    const x = caretX.get();
    const h = rowH.get();
    const fresh: Particle[] = Array.from({ length: n }, () => ({
      id: particleId.current++,
      x: x + (Math.random() - 0.3) * 6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.3,
      dx: (10 + Math.random() * 50) * spread,
      dy: (Math.random() - 0.5) * h * 0.9 * spread,
      size: 1.5 + Math.random() * 1.5,
      dur: 0.6 + Math.random() * 0.7,
    }));
    setParticles((p) => [...p, ...fresh].slice(-MAX_PARTICLES));
  };

  /* ── dictation ────────────────────────────────────────────────────── */

  const dictation = useDictation({
    onText: (t) => {
      setValue((v) => (v ? v.replace(/\s*$/, " ") : "") + t);
      pump(0.6);
      emit(8);
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        input.scrollLeft = input.scrollWidth;
        syncCaret();
      });
    },
    onError: say,
  });

  const toggleDictation = () => {
    sounds.tick();
    if (dictation.listening) dictation.stop();
    else dictation.start();
  };

  /* ── actions ──────────────────────────────────────────────────────── */

  const send = () => {
    if (busy || !canSend) return;
    sounds.submit();
    pump(1, 0.5);
    emit(14, 1.5);
    onSend({
      text: value.trim() || "Take a look at these files.",
      think,
      tool,
      files: files.map((f) => f.name),
    });
    files.forEach((f) => f.url && URL.revokeObjectURL(f.url));
    setValue("");
    setCaret(0);
    setFiles([]);
    setTool(null);
    if (dictation.listening) dictation.stop();
    inputRef.current?.focus({ preventScroll: true });
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
    pump(grew ? 0.3 : 0.12);
    if (grew) requestAnimationFrame(() => emit(1 + Math.round(Math.random() * 2)));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    } else if (e.key === "Escape") {
      if (menuOpen) setMenuOpen(false);
      else if (value) {
        setValue("");
        setCaret(0);
        pump(0.2);
      }
    } else if (e.key === "Backspace" && !value) {
      /* backspace in an empty field peels off the tool, then attachments */
      if (tool) setTool(null);
      else if (files.length) removeFile(files[files.length - 1].id);
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...list].slice(0, 6).map((f) => ({
      id: fileId.current++,
      name: f.name,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    setFiles((cur) => [...cur, ...next].slice(0, 6));
    sounds.tick();
    pump(0.4);
    inputRef.current?.focus();
  };

  const removeFile = (id: number) => {
    setFiles((cur) => {
      const gone = cur.find((f) => f.id === id);
      if (gone?.url) URL.revokeObjectURL(gone.url);
      return cur.filter((f) => f.id !== id);
    });
  };

  /* close the + menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  /* ── derived motion ───────────────────────────────────────────────── */

  const glowOpacity = useTransform(() => 0.45 + focus.get() * 0.3 + energy.get() * 0.35);
  const glowScaleX = useTransform(() => 1 + energy.get() * 0.35);
  const glowScaleY = useTransform(() => 1 + energy.get() * 0.15);
  const coreOpacity = useTransform(() => 0.3 + focus.get() * 0.25 + energy.get() * 0.45);
  const caretGlow = useTransform(
    () => `0 0 ${8 + energy.get() * 12}px rgb(255 30 30 / ${0.55 + energy.get() * 0.4})`,
  );
  const ring = useTransform(() => {
    const f = focus.get();
    const e = energy.get();
    return [
      `0 0 0 1px rgb(255 ${255 - f * 215} ${255 - f * 215} / ${0.09 + f * 0.16 + e * 0.15})`,
      `0 0 ${24 + e * 36}px -6px rgb(255 20 20 / ${f * 0.18 + e * 0.35})`,
      "0 24px 48px -24px rgb(0 0 0 / 0.9)",
    ].join(", ");
  });

  const placeholder = dictation.listening ? "Listening…" : tool === "image" ? "Describe an image" : tool === "research" ? "What should I research?" : "Ask anything";
  const hasChips = files.length > 0 || tool !== null;

  return (
    <div className="w-full">
      <motion.div
        layout
        transition={morph}
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="composer relative isolate w-full rounded-[28px]"
      >
        {/* surface + reactive ring */}
        <motion.div
          aria-hidden
          className="composer-surface pointer-events-none absolute inset-0 -z-20 rounded-[28px]"
          style={{ boxShadow: ring }}
        />

        {/* attachments and the active tool, above the input */}
        <AnimatePresence initial={false}>
          {hasChips && (
            <motion.div
              key="chips"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={morph}
              className="overflow-hidden"
            >
              <motion.ul layout className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attached to this message">
                <AnimatePresence initial={false} mode="popLayout">
                  {tool && (
                    <Chip key="tool" onRemove={() => setTool(null)} label={`Remove ${toolLabel(tool)}`} accent>
                      {tool === "image" ? <ImagePlus className="size-3.5" /> : <Telescope className="size-3.5" />}
                      {toolLabel(tool)}
                    </Chip>
                  )}
                  {files.map((f) => (
                    <Chip key={f.id} onRemove={() => removeFile(f.id)} label={`Remove ${f.name}`}>
                      {f.url ? (
                        <img src={f.url} alt="" className="size-5 rounded-[5px] object-cover" />
                      ) : (
                        <FileText className="size-3.5" />
                      )}
                      <span className="max-w-[140px] truncate">{f.name}</span>
                    </Chip>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={rowRef}
          className="relative flex h-14 cursor-text items-center gap-1 pl-2 pr-2"
          onPointerDown={(e) => {
            if ((e.target as Element).closest("button, input, [role=menu]")) return;
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          {/* glow lives behind the text and may bleed past the bar */}
          <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-10" style={{ x: glowX }}>
            <motion.div
              className="absolute -left-10 top-1/2 h-[96px] w-[300px] -translate-y-1/2"
              style={{
                opacity: glowOpacity,
                scaleX: glowScaleX,
                scaleY: glowScaleY,
                originX: 0.13,
                background:
                  "radial-gradient(ellipse 50% 50% at 42% 50%, rgb(205 14 14 / 0.95) 0%, rgb(150 0 0 / 0.6) 34%, rgb(90 0 0 / 0.22) 62%, transparent 78%)",
              }}
            />
            <motion.div
              className="absolute -left-1 top-1/2 h-[46px] w-[130px] -translate-y-1/2 mix-blend-screen"
              style={{
                opacity: coreOpacity,
                background:
                  "radial-gradient(ellipse 50% 50% at 40% 50%, rgb(255 190 190 / 0.55) 0%, rgb(255 70 70 / 0.3) 38%, transparent 72%)",
              }}
            />
            {!reduce && <Embers />}
          </motion.div>

          {/* + menu */}
          <div ref={menuRef} className="relative">
            <IconButton
              label="Add files and tools"
              expanded={menuOpen}
              onClick={() => {
                sounds.tick();
                setMenuOpen((o) => !o);
              }}
            >
              <motion.span animate={{ rotate: menuOpen ? 45 : 0 }} transition={snappy} className="block text-[#ff2a2a]">
                <Plus className="size-5" strokeWidth={1.75} />
              </motion.span>
            </IconButton>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 8, scale: 0.96, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 6, scale: 0.97, filter: "blur(4px)" }}
                  transition={snappy}
                  style={{ originX: 0, originY: 1 }}
                  className="absolute bottom-full left-0 z-30 mb-3 w-60 rounded-2xl border border-white/10 bg-[#121213]/95 p-1.5 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.9)] backdrop-blur-xl"
                >
                  <MenuItem
                    icon={<Paperclip className="size-4" />}
                    label="Add photos & files"
                    onClick={() => {
                      setMenuOpen(false);
                      fileRef.current?.click();
                    }}
                  />
                  <MenuItem
                    icon={<ImagePlus className="size-4" />}
                    label="Create image"
                    active={tool === "image"}
                    onClick={() => {
                      setMenuOpen(false);
                      setTool("image");
                      sounds.tick();
                      pump(0.4);
                      inputRef.current?.focus();
                    }}
                  />
                  <MenuItem
                    icon={<Telescope className="size-4" />}
                    label="Deep research"
                    active={tool === "research"}
                    onClick={() => {
                      setMenuOpen(false);
                      setTool("research");
                      sounds.tick();
                      pump(0.4);
                      inputRef.current?.focus();
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <input
              ref={fileRef}
              id="composer-files"
              type="file"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* the field: a real input with transparent text, mirrored by a
              gradient copy so the custom caret and glow can track it */}
          <div
            ref={fieldRef}
            className="relative h-full min-w-0 flex-1 overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, black 0%, black 88%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 0%, black 88%, transparent 100%)",
            }}
          >
            <div ref={mirrorRef} aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
              {value ? (
                <span key={fontsReady ? "ready" : "loading"} className="composer-text composer-gradient whitespace-pre pl-1.5">
                  {value}
                </span>
              ) : (
                <span className="composer-text whitespace-pre pl-1.5 text-neutral-500">{placeholder}</span>
              )}
            </div>
            <span
              ref={measureRef}
              aria-hidden
              className="composer-text pointer-events-none invisible absolute left-0 top-0 whitespace-pre"
            >
              {value.slice(0, caret)}
            </span>
            <input
              ref={inputRef}
              id="composer-input"
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
              onPaste={(e) => {
                if (e.clipboardData.files.length) {
                  e.preventDefault();
                  addFiles(e.clipboardData.files);
                }
              }}
              maxLength={2000}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="send"
              aria-label="Message"
              className="composer-text composer-input absolute inset-0 h-full w-full bg-transparent pl-1.5 pr-6 text-transparent caret-transparent outline-none"
            />
          </div>

          {/* custom caret */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-1/2 -ml-px h-[22px] w-[2px] -translate-y-1/2 rounded-full bg-[#ff2020]"
            style={{ x: caretSmooth, boxShadow: caretGlow }}
            animate={focused ? { opacity: [1, 1, 0, 0, 1] } : { opacity: 0 }}
            transition={
              focused
                ? { duration: 1.05, repeat: Infinity, times: [0, 0.5, 0.55, 0.95, 1], ease: "linear" }
                : { duration: 0.2 }
            }
          />

          <ThinkToggle
            on={think}
            onToggle={() => {
              sounds.tick();
              setThink((t) => !t);
              pump(think ? 0.1 : 0.45);
            }}
          />

          <IconButton
            label={dictation.listening ? "Stop dictation" : "Dictate"}
            pressed={dictation.listening}
            onClick={toggleDictation}
            className={dictation.listening ? "text-[#ff4040]" : ""}
          >
            {dictation.listening && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[#ff1f1f]/20"
                animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <Mic className="relative size-[18px]" strokeWidth={1.9} />
          </IconButton>

          <SendButton
            mode={busy ? "stop" : canSend ? "send" : "voice"}
            listening={dictation.listening}
            onClick={() => {
              if (busy) {
                sounds.close();
                onStop();
              } else if (canSend) send();
              else toggleDictation();
            }}
          />

          {/* sparks thrown off the caret while typing */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
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
        </div>
      </motion.div>

      <div className="relative mt-3 flex h-5 items-center justify-center text-center text-[12px]" role="status" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={notice || "hint"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={snappy}
            className={notice ? "text-[#ff7a7a]" : "text-neutral-600"}
          >
            {notice || "Demo replies. No AI model is connected."}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function toolLabel(tool: Exclude<Tool, null>) {
  return tool === "image" ? "Image" : "Research";
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
  expanded,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
  expanded?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.88 }}
      transition={snappy}
      className={
        "relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff2a2a]/70 " +
        className
      }
    >
      {children}
    </motion.button>
  );
}

function ThinkToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      aria-pressed={on}
      aria-label="Think longer"
      title="Think longer before replying"
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      transition={snappy}
      className={
        "relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-[#ff2a2a]/70 " +
        (on ? "text-[#ff6b6b]" : "text-neutral-400 hover:bg-white/[0.07] hover:text-neutral-200")
      }
    >
      <AnimatePresence>
        {on && (
          <motion.span
            layoutId="think-bg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={snappy}
            className="absolute inset-0 rounded-full border border-[#ff2a2a]/30 bg-[#ff1f1f]/10"
          />
        )}
      </AnimatePresence>
      <motion.span
        className="relative"
        animate={on ? { rotate: [0, -12, 10, 0], scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Brain className="size-[17px]" strokeWidth={1.8} />
      </motion.span>
      <span className="relative hidden sm:inline">Think</span>
    </motion.button>
  );
}

function SendButton({
  mode,
  listening,
  onClick,
}: {
  mode: "send" | "stop" | "voice";
  listening: boolean;
  onClick: () => void;
}) {
  const label = mode === "send" ? "Send message" : mode === "stop" ? "Stop generating" : listening ? "Stop dictation" : "Speak your message";
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.88 }}
      transition={snappy}
      className="relative ml-0.5 grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full text-white shadow-[0_6px_20px_-6px_rgb(255_20_20/0.8),inset_0_1px_0_rgb(255_255_255/0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff2a2a]/80"
      style={{ background: "radial-gradient(circle at 35% 25%, #ff5a4a 0%, #f01818 45%, #a50000 100%)" }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={mode}
          initial={{ opacity: 0, scale: 0.4, rotate: -60, y: mode === "send" ? 8 : 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.4, rotate: 60, y: mode === "send" ? -8 : 0 }}
          transition={snappy}
          className="block"
        >
          {mode === "send" ? (
            <ArrowUp className="size-[18px]" strokeWidth={2.4} />
          ) : mode === "stop" ? (
            <Square className="size-3.5" fill="currentColor" strokeWidth={0} />
          ) : (
            <AudioLines className="size-[18px]" strokeWidth={2.1} />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-none " +
        (active ? "text-[#ff6b6b]" : "text-neutral-200")
      }
    >
      <span className={active ? "text-[#ff4040]" : "text-neutral-400"}>{icon}</span>
      {label}
    </button>
  );
}

function Chip({
  children,
  onRemove,
  label,
  accent,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={snappy}
      className={
        "flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-1 text-[13px] " +
        (accent
          ? "border-[#ff2a2a]/30 bg-[#ff1f1f]/10 text-[#ff8080]"
          : "border-white/10 bg-white/[0.05] text-neutral-200")
      }
    >
      {children}
      <button
        type="button"
        aria-label={label}
        onClick={onRemove}
        className="grid size-6 cursor-pointer place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff2a2a]/70"
      >
        <X className="size-3.5" />
      </button>
    </motion.li>
  );
}

/* tiny specks floating in the light, like dust in a beam */
const EMBERS = [
  { x: 40, y: 0.2, d: 3.2 },
  { x: 90, y: 0.8, d: 4.1 },
  { x: 14, y: 0.88, d: 3.6 },
  { x: 150, y: 0.28, d: 4.6 },
  { x: 70, y: 0.6, d: 3.9 },
];

function Embers() {
  return (
    <>
      {EMBERS.map((e, i) => (
        <motion.span
          key={i}
          className="absolute size-[2px] rounded-full bg-[#ff4d4d]"
          style={{ left: e.x, top: `${e.y * 100}%` }}
          animate={{ x: [0, 12, 0], y: [0, -6, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: e.d, repeat: Infinity, delay: i * 0.45, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/* ── speech-to-text via the Web Speech API, where the browser has it ── */

type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function useDictation({ onText, onError }: { onText: (t: string) => void; onError: (msg: string) => void }) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const handlers = useRef({ onText, onError });
  handlers.current = { onText, onError };

  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      handlers.current.onError("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (text.trim()) handlers.current.onText(text.trim());
    };
    r.onerror = (e) => {
      if (e.error === "aborted") return;
      handlers.current.onError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access is blocked. Allow it in your browser to dictate."
          : e.error === "no-speech"
            ? "Didn't catch that. Tap the mic and try again."
            : "Voice input stopped. Try again.",
      );
    };
    r.onend = () => setListening(false);
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      handlers.current.onError("Couldn't start the microphone. Try again.");
    }
  };

  const stop = () => {
    rec.current?.stop();
    setListening(false);
  };

  return { listening, start, stop };
}
