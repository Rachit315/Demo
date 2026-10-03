import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useMotionValue } from "motion/react";
import { SquarePen } from "lucide-react";
import { GridBackdrop } from "./GridBackdrop";
import { Composer, morph, type SendPayload } from "./Composer";
import { draftReply, type Tool } from "./replies";
import { sounds } from "./sounds";

type Message =
  | { id: number; role: "user"; text: string; files: string[]; tool: Tool }
  | {
      id: number;
      role: "assistant";
      text: string;
      tool: Tool;
      thinking: boolean;
      thoughtMs?: number;
      streaming: boolean;
      stopped?: boolean;
    };

const THINK_MS = 1600;

export function PromptPage() {
  const energy = useMotionValue(0);
  const focus = useMotionValue(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  const started = messages.length > 0;
  const live = messages.find((m) => m.role === "assistant" && m.streaming);
  const busy = Boolean(live);

  const clearTimers = () => {
    timers.current.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const patch = (id: number, fn: (m: Extract<Message, { role: "assistant" }>) => Partial<Message>) =>
    setMessages((all) => all.map((m) => (m.id === id && m.role === "assistant" ? ({ ...m, ...fn(m) } as Message) : m)));

  const stream = (id: number, full: string) => {
    /* split into words + whitespace so the text grows a word or two per tick */
    const tokens = full.split(/(\s+)/);
    let i = 0;
    const tick = window.setInterval(() => {
      i = Math.min(tokens.length, i + 2 + Math.floor(Math.random() * 3));
      const text = tokens.slice(0, i).join("");
      const done = i >= tokens.length;
      patch(id, () => ({ text, streaming: !done }));
      if (done) {
        window.clearInterval(tick);
        sounds.done();
      }
    }, 38);
    timers.current.push(tick);
  };

  const send = ({ text, think, tool, files }: SendPayload) => {
    const userId = nextId.current++;
    const botId = nextId.current++;
    const reply = draftReply(text, tool, files);
    setMessages((all) => [
      ...all,
      { id: userId, role: "user", text, files, tool },
      { id: botId, role: "assistant", text: "", tool, thinking: think, streaming: true },
    ]);
    if (think) {
      const ms = THINK_MS + Math.round(Math.random() * 600);
      timers.current.push(
        window.setTimeout(() => {
          patch(botId, () => ({ thinking: false, thoughtMs: ms }));
          stream(botId, reply);
        }, ms),
      );
    } else {
      timers.current.push(window.setTimeout(() => stream(botId, reply), 420));
    }
  };

  const stop = () => {
    clearTimers();
    setMessages((all) =>
      all.map((m) =>
        m.role === "assistant" && m.streaming ? { ...m, streaming: false, thinking: false, stopped: true } : m,
      ),
    );
  };

  const reset = () => {
    clearTimers();
    sounds.close();
    setMessages([]);
  };

  /* keep the newest text in view while it streams, unless the reader
     has scrolled up to look at something */
  const stick = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  return (
    <div className="prompt-page relative h-dvh overflow-hidden text-white">
      <GridBackdrop energy={energy} focus={focus} anchorY={started ? 0.86 : 0.5} />

      <AnimatePresence>
        {started && (
          <motion.button
            type="button"
            onClick={reset}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={morph}
            whileTap={{ scale: 0.95 }}
            className="fixed left-4 top-4 z-50 flex h-[38px] cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#121213]/80 px-3.5 text-[14px] text-neutral-300 backdrop-blur-md transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff2a2a]/70"
          >
            <SquarePen className="size-4" strokeWidth={1.9} />
            New chat
          </motion.button>
        )}
      </AnimatePresence>

      <LayoutGroup>
        <div className="relative flex h-full flex-col px-4">
          {/* conversation (or, before the first message, an empty spacer
              that keeps the composer centred) */}
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className={"chat-scroll -mx-4 min-h-0 overflow-y-auto px-4 " + (started ? "flex-1" : "flex-1 basis-0")}
          >
            {started && (
              <ol className="mx-auto flex w-full max-w-[720px] flex-col gap-7 pb-8 pt-20" aria-label="Conversation">
                {messages.map((m) =>
                  m.role === "user" ? <UserBubble key={m.id} msg={m} /> : <AssistantReply key={m.id} msg={m} prompt={promptFor(messages, m.id)} />,
                )}
              </ol>
            )}
          </div>

          <AnimatePresence initial={false}>
            {!started && (
              <motion.h1
                key="hero"
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(6px)", transition: { duration: 0.22 } }}
                transition={{ ...morph, delay: 0.1 }}
                className="mx-auto mb-7 text-balance text-center text-[26px] font-normal tracking-[-0.02em] text-white sm:text-[30px]"
              >
                Ready when you are.
              </motion.h1>
            )}
          </AnimatePresence>

          <motion.div layout transition={morph} className="mx-auto w-full max-w-[760px] pb-[max(16px,env(safe-area-inset-bottom))]">
            <Composer energy={energy} focus={focus} busy={busy} onSend={send} onStop={stop} />
          </motion.div>

          {/* bottom spacer only while centred */}
          <motion.div layout transition={morph} className={started ? "h-0" : "flex-1 basis-0"} />
        </div>
      </LayoutGroup>
    </div>
  );
}

function promptFor(all: Message[], assistantId: number) {
  const i = all.findIndex((m) => m.id === assistantId);
  const prev = all[i - 1];
  return prev?.role === "user" ? prev.text : "";
}

function UserBubble({ msg }: { msg: Extract<Message, { role: "user" }> }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={morph}
      style={{ originX: 1 }}
      className="flex flex-col items-end gap-2"
    >
      {(msg.files.length > 0 || msg.tool) && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {msg.tool && (
            <span className="rounded-full border border-[#ff2a2a]/30 bg-[#ff1f1f]/10 px-2.5 py-1 text-[12px] text-[#ff8080]">
              {msg.tool === "image" ? "Image" : "Research"}
            </span>
          )}
          {msg.files.map((f) => (
            <span key={f} className="max-w-[200px] truncate rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[12px] text-neutral-300">
              {f}
            </span>
          ))}
        </div>
      )}
      <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-[22px] bg-[#1c1c1e] px-4 py-2.5 text-[15px] leading-relaxed text-neutral-100 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
        {msg.text}
      </p>
    </motion.li>
  );
}

function AssistantReply({ msg, prompt }: { msg: Extract<Message, { role: "assistant" }>; prompt: string }) {
  const waiting = msg.streaming && !msg.text;
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...morph, delay: 0.08 }}
      className="flex gap-3"
      aria-busy={msg.streaming}
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-[#ff2a2a]/30 bg-[#ff1f1f]/10 text-[#ff2a2a]">
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3v18M3 12h18" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {msg.thinking ? (
          <Shimmer>Thinking</Shimmer>
        ) : msg.thoughtMs ? (
          <p className="mb-2 text-[13px] text-neutral-500">Thought for {(msg.thoughtMs / 1000).toFixed(1)}s</p>
        ) : null}

        {waiting && !msg.thinking && <PulseDots />}

        {msg.text && (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-neutral-200">
            {msg.text}
            {msg.streaming && (
              <motion.span
                aria-hidden
                className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] rounded-full bg-[#ff2a2a] shadow-[0_0_8px_#ff2a2a]"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </p>
        )}

        {msg.stopped && <p className="mt-2 text-[13px] text-neutral-500">Stopped.</p>}

        <AnimatePresence>
          {msg.tool === "image" && !msg.streaming && !msg.stopped && <ConceptFrame prompt={prompt} />}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

/* the "Create image" result: a frame drawn in the page's own language */
function ConceptFrame({ prompt }: { prompt: string }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 12, scale: 0.97, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={morph}
      className="relative mt-4 aspect-[16/10] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 40 40 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 40 40 / 0.12) 1px, transparent 1px)",
          backgroundSize: "25% 33.4%",
        }}
      />
      <motion.div
        className="absolute left-[30%] top-1/2 h-[70%] w-[75%] -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse 50% 50% at 40% 50%, rgb(205 14 14 / 0.95), rgb(120 0 0 / 0.45) 40%, transparent 75%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <figcaption className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-2 px-[8%]">
        <span className="h-8 w-[2px] shrink-0 rounded-full bg-[#ff2020] shadow-[0_0_10px_#ff2020]" />
        <span className="composer-gradient truncate text-[22px] tracking-[-0.02em]">{prompt}</span>
      </figcaption>
    </motion.figure>
  );
}

function Shimmer({ children }: { children: string }) {
  return (
    <motion.p
      className="mb-2 inline-block bg-clip-text text-[14px] text-transparent"
      style={{
        backgroundImage: "linear-gradient(90deg, #6b6b6b 0%, #6b6b6b 35%, #ffb0b0 50%, #6b6b6b 65%, #6b6b6b 100%)",
        backgroundSize: "250% 100%",
      }}
      animate={{ backgroundPosition: ["100% 0%", "-50% 0%"] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.p>
  );
}

function PulseDots() {
  return (
    <span className="flex h-6 items-center gap-1" aria-label="Writing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-[#ff3b3b]"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
