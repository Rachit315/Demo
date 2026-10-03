import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, type Transition } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { people, type Person } from "./people";
import { sounds } from "./sounds";

type SelectionListProps = {
  /* corner — 0 to 40px, radius of the open card */
  corner?: number;
  /* how many people are shown on the collapsed pill */
  rows?: "2" | "3" | "4";
};

/* one spring drives the whole morph so every piece lands together */
const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
const fade = (delay = 0): Transition => ({ duration: 0.22, ease: [0.25, 0.1, 0.25, 1], delay });

const CONTENT_OUT_MS = 120;
const out: Transition = { duration: CONTENT_OUT_MS / 1000, ease: [0.4, 0, 1, 1] };

const CARD_W = 300;
const STAGE_H = 312;
const PILL_RADIUS = 32;

export function SelectionList({ corner = 20, rows = "4" }: SelectionListProps) {
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  /* closing: the card's contents fade out first, then the surface morphs back */
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  const visible = Number(rows);
  const hidden = people.length - visible;
  const radius = Math.min(40, Math.max(0, corner));

  const closeTimer = useRef<number>(undefined);
  const close = (returnFocus: boolean) => {
    if (closeTimer.current) return;
    sounds.close();
    refocus.current = returnFocus;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined;
      setClosing(false);
      setOpen(false);
    }, CONTENT_OUT_MS);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openCard = () => {
    sounds.open();
    setOpen(true);
  };

  /* hand focus back to the pill after a keyboard / close-button dismissal */
  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      pillRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  /* Escape or a click outside closes; page chrome marked data-keep-open
     (the theme switch) doesn't count as outside */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (rootRef.current?.contains(target) || target.closest?.("[data-keep-open]")) return;
      close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <LayoutGroup id="voice-chat">
      {/* fixed stage: both states are centred in the same box, so the morph
          grows out of the pill's centre and never shifts the page */}
      <div ref={rootRef} className="grid place-items-center" style={{ width: CARD_W, height: STAGE_H }}>
        {open ? (
          <motion.div
            key="card"
            layoutId="shell"
            transition={morph}
            role="dialog"
            aria-label="Voice Chat"
            className="relative overflow-hidden bg-surface shadow-[var(--card-shadow)]"
            style={{ width: CARD_W, borderRadius: radius }}
          >
            {/* live badge parks in the header corner and fades out */}
            <motion.div
              layoutId="badge"
              transition={morph}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 0.5, transition: { ...morph, opacity: fade() } }}
              className="pointer-events-none absolute left-2 top-1 z-10 grid size-7 place-items-center bg-badge"
              style={{ borderRadius: 999 }}
            >
              <Bars className="h-3 gap-[2px]" bar="w-[2px] bg-badge-ink" />
            </motion.div>

            {/* "+3" travels into the card and dissolves */}
            <motion.span
              layoutId="more"
              transition={morph}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, transition: { ...morph, opacity: fade() } }}
              className="pointer-events-none absolute right-4 top-[62px] flex items-center gap-0.5 text-[15px] tabular-nums text-subtle"
            >
              +{hidden}
              <ChevronDown className="size-[15px]" strokeWidth={2.25} />
            </motion.span>

            <motion.header
              layout="position"
              transition={morph}
              initial={{ opacity: 0, y: -4 }}
              animate={
                closing
                  ? { opacity: 0, y: -4, transition: out }
                  : { opacity: 1, y: 0, transition: { ...morph, opacity: fade(0.08) } }
              }
              className="relative flex h-9 items-center justify-center border-b border-line bg-surface-2"
            >
              <span className="text-[14px] font-medium tracking-[-0.01em] text-muted">Voice Chat</span>
              <motion.button
                type="button"
                aria-label="Close"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => close(true)}
                className="absolute right-2 grid size-[22px] cursor-pointer place-items-center rounded-full bg-chip text-subtle transition-colors hover:bg-chip-hover hover:text-muted focus-visible:outline-2 focus-visible:outline-subtle"
              >
                <X className="size-3" strokeWidth={2.75} />
              </motion.button>
            </motion.header>

            <ul className="grid grid-cols-4 gap-y-3.5 px-3 pt-4">
              {people.map((p, i) => (
                <CardMember
                  key={p.id}
                  person={p}
                  index={i}
                  extra={i >= visible}
                  order={i - visible}
                  closing={closing}
                />
              ))}
            </ul>

            <motion.footer
              layout="position"
              transition={morph}
              initial={{ opacity: 0, y: 10 }}
              animate={
                closing
                  ? { opacity: 0, y: 8, transition: out }
                  : { opacity: 1, y: 0, transition: { ...morph, delay: 0.04, opacity: fade(0.12) } }
              }
              className="px-3.5 pb-3.5 pt-5"
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (joined) sounds.leave();
                  else sounds.join();
                  setJoined(!joined);
                }}
                style={{
                  background: "linear-gradient(180deg, var(--btn-top) 0%, var(--btn-bottom) 100%)",
                  color: "var(--btn-text)",
                  boxShadow: "0 8px 16px -8px var(--btn-shadow), inset 0 1px 0 rgb(255 255 255 / 0.14)",
                }}
                className="relative h-10 w-full cursor-pointer overflow-hidden rounded-[11px] text-[14px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subtle"
              >
                <Swap key={joined ? "leave" : "join"} distance={14}>
                  {joined ? "Leave Chat" : "Join Now"}
                </Swap>
              </motion.button>
              <div className="relative mt-2.5 h-4 overflow-hidden text-center text-[12px] text-subtle">
                <Swap key={joined ? "joined" : "idle"} distance={10}>
                  {joined ? "You're in. Your mic is muted." : "Mic will be muted initially."}
                </Swap>
              </div>
            </motion.footer>
          </motion.div>
        ) : (
          <motion.div
            key="pill"
            ref={pillRef}
            layoutId="shell"
            transition={morph}
            role="button"
            tabIndex={0}
            aria-label={`Open voice chat, ${people.length} people`}
            aria-expanded={false}
            onClick={openCard}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openCard();
              }
            }}
            className="group relative flex cursor-pointer items-center bg-surface shadow-[var(--card-shadow)] py-1.5 pl-1.5 pr-3.5 outline-none focus-visible:ring-2 focus-visible:ring-subtle"
            style={{ borderRadius: PILL_RADIUS }}
          >
            <motion.div
              layoutId="badge"
              transition={morph}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, transition: { ...morph, opacity: fade(0.1) } }}
              className="pointer-events-none absolute -left-2 -top-2 z-20 grid size-7 place-items-center bg-badge ring-[3px] ring-surface"
              style={{ borderRadius: 999 }}
            >
              <Bars className="h-3 gap-[2px]" bar="w-[2px] bg-badge-ink" />
            </motion.div>

            {people.slice(0, visible).map((p, i) => (
              <motion.div
                key={p.id}
                layoutId={`avatar-${p.id}`}
                transition={morph}
                className={"relative " + (i === 0 ? "" : "-ml-1.5")}
                style={{ zIndex: 10 - i, borderRadius: 999 }}
              >
                <Avatar person={p} />
              </motion.div>
            ))}

            {hidden > 0 && (
              <motion.span
                layoutId="more"
                transition={morph}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { ...morph, opacity: fade(0.14) } }}
                className="ml-2 flex items-center gap-0.5 text-[15px] tabular-nums text-subtle transition-colors group-hover:text-muted"
              >
                +{hidden}
                <ChevronDown
                  className="size-[15px] transition-transform duration-300 group-hover:translate-y-px"
                  strokeWidth={2.25}
                />
              </motion.span>
            )}
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
}

function CardMember({
  person,
  index,
  extra,
  order,
  closing,
}: {
  person: Person;
  index: number;
  extra: boolean;
  order: number;
  closing: boolean;
}) {
  return (
    <li className="flex flex-col items-center">
      <motion.div
        layoutId={`avatar-${person.id}`}
        transition={extra ? { ...morph, delay: 0.06 + order * 0.04 } : morph}
        initial={extra ? { opacity: 0, scale: 0.6, y: 10 } : false}
        animate={
          closing && extra ? { opacity: 0, scale: 0.7, y: 6, transition: out } : { opacity: 1, scale: 1, y: 0 }
        }
        className="relative"
        style={{ borderRadius: 999 }}
      >
        <motion.div whileHover={{ y: -2 }} transition={morph}>
          <Avatar person={person} />
        </motion.div>
        {person.speaking && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4 }}
            animate={
              closing
                ? { opacity: 0, scale: 0.4, transition: out }
                : { opacity: 1, scale: 1, transition: { ...morph, delay: 0.16 } }
            }
            className="absolute -right-1.5 -top-1 grid size-[19px] place-items-center rounded-full bg-surface shadow-[0_0_0_1px_var(--ring),0_2px_4px_rgb(0_0_0/0.1)]"
          >
            <Bars className="h-2 gap-[1.5px]" bar="w-[1.5px] bg-muted" />
          </motion.span>
        )}
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: -3 }}
        animate={
          closing
            ? { opacity: 0, transition: out }
            : { opacity: 1, y: 0, transition: { ...morph, delay: 0.1, opacity: fade(0.1 + index * 0.015) } }
        }
        className="mt-1 whitespace-nowrap text-[13px] tracking-[-0.01em] text-muted"
      >
        {person.name}
      </motion.span>
    </li>
  );
}

function Avatar({ person }: { person: Person }) {
  return (
    <img
      src={person.src}
      alt={person.name}
      width={46}
      height={46}
      draggable={false}
      decoding="async"
      className="block size-[46px] select-none rounded-full border-[2.5px] border-surface bg-chip object-cover shadow-[0_0_0_1px_var(--ring),0_2px_5px_rgb(0_0_0/0.08)]"
    />
  );
}

/* text that rolls up when it changes (button label, footer note);
   give it a new key to trigger the roll */
function Swap({ distance, children }: { distance: number; children: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={morph}
      className="block"
    >
      {children}
    </motion.span>
  );
}

/* equaliser bars for the speaking indicators — transform-only, so they run
   on the compositor and never trigger layout */
const barPattern = [
  { h: [0.35, 1, 0.5, 0.8, 0.35], d: 1.1 },
  { h: [0.7, 0.3, 1, 0.45, 0.7], d: 0.9 },
  { h: [0.5, 0.9, 0.3, 1, 0.5], d: 1.25 },
  { h: [0.9, 0.45, 0.75, 0.3, 0.9], d: 1.0 },
];

function Bars({ className, bar }: { className: string; bar: string }) {
  return (
    <span className={"flex items-center " + className} aria-hidden>
      {barPattern.map((b, i) => (
        <motion.span
          key={i}
          className={"h-full rounded-full " + bar}
          style={{ originY: 0.5 }}
          animate={{ scaleY: b.h }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
