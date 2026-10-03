import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, type Transition } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { people, type Person } from "./people";

type SelectionListProps = {
  /* corner — 0 to 40px, radius of the open card */
  corner?: number;
  /* how many people are shown on the collapsed pill */
  rows?: "2" | "3" | "4";
};

const spring: Transition = { type: "spring", duration: 0.55, bounce: 0.18 };

/* soft "focus pull" used by everything that appears / disappears */
const reveal = {
  initial: { opacity: 0, filter: "blur(6px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(6px)" },
};

export function SelectionList({ corner = 20, rows = "4" }: SelectionListProps) {
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const visible = Number(rows);
  const hidden = people.length - visible;
  const radius = Math.min(40, Math.max(0, corner));

  /* close on Escape / outside click */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <LayoutGroup>
      <motion.div ref={rootRef} layout transition={spring} className="relative">
        {/* live-audio badge: sits on the pill, slides into the header and fades when open */}
        <motion.div
          layout
          transition={spring}
          animate={open ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
          className={
            "pointer-events-none absolute z-20 grid size-8 place-items-center rounded-full bg-neutral-900 ring-2 ring-white " +
            (open ? "left-2.5 top-1" : "-left-2 -top-2")
          }
        >
          <Bars className="h-3.5 gap-[2.5px]" bar="w-[2.5px] bg-white" />
        </motion.div>

        <motion.div
          layout
          transition={spring}
          initial={false}
          animate={{ borderRadius: open ? radius : 40 }}
          role={open ? "dialog" : "button"}
          aria-label={open ? "Voice Chat" : `Open voice chat, ${people.length} people`}
          aria-expanded={open}
          tabIndex={open ? -1 : 0}
          onClick={() => !open && setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={
            "group relative overflow-hidden bg-white outline-none " +
            "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_10px_30px_-8px_rgba(0,0,0,0.14),0_2px_6px_-2px_rgba(0,0,0,0.06)] " +
            "focus-visible:ring-2 focus-visible:ring-neutral-300 " +
            (open ? "w-[336px] max-w-[calc(100vw-32px)]" : "cursor-pointer")
          }
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {open && (
              <motion.header
                key="header"
                layout="position"
                {...reveal}
                initial={{ ...reveal.initial, y: -8 }}
                animate={{ ...reveal.animate, y: 0 }}
                exit={{ ...reveal.exit, y: -8 }}
                transition={spring}
                className="relative flex h-10 w-[336px] max-w-full items-center justify-center border-b border-neutral-100 bg-neutral-50"
              >
                <span className="text-[15px] font-medium tracking-[-0.01em] text-neutral-500">
                  Voice Chat
                </span>
                <motion.button
                  type="button"
                  aria-label="Close"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  className="absolute right-2.5 grid size-6 cursor-pointer place-items-center rounded-full bg-neutral-200/70 text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </motion.button>
              </motion.header>
            )}
          </AnimatePresence>

          <motion.ul
            layout
            transition={spring}
            className={
              open
                ? "grid grid-cols-4 gap-y-4 px-4 pt-5"
                : "flex items-center py-2 pl-2 pr-4"
            }
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {people.map((p, i) =>
                i < visible || open ? (
                  <Member
                    key={p.id}
                    person={p}
                    open={open}
                    index={i}
                    extra={i >= visible}
                    stagger={i - visible}
                  />
                ) : null,
              )}

              {!open && hidden > 0 && (
                <motion.li
                  key="more"
                  layout="position"
                  initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 10, filter: "blur(4px)" }}
                  transition={spring}
                  className="ml-2.5 flex items-center gap-1 text-[17px] text-neutral-400 transition-colors group-hover:text-neutral-600"
                >
                  +{hidden}
                  <ChevronDown
                    className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
                    strokeWidth={2.25}
                  />
                </motion.li>
              )}
            </AnimatePresence>
          </motion.ul>

          <AnimatePresence mode="popLayout" initial={false}>
            {open && (
              <motion.footer
                key="footer"
                layout="position"
                initial={{ ...reveal.initial, y: 16 }}
                animate={{ ...reveal.animate, y: 0 }}
                exit={{ ...reveal.exit, y: 16 }}
                transition={{ ...spring, delay: 0.04 }}
                className="w-[336px] max-w-full px-4 pb-4 pt-6"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setJoined((j) => !j)}
                  className={
                    "relative h-11 w-full cursor-pointer overflow-hidden rounded-xl text-[15px] font-medium text-white " +
                    "bg-[linear-gradient(180deg,#3b3b3d_0%,#0c0c0d_100%)] " +
                    "shadow-[0_10px_18px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)]"
                  }
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={joined ? "leave" : "join"}
                      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                      transition={spring}
                      className="inline-block"
                    >
                      {joined ? "Leave Chat" : "Join Now"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p
                    key={joined ? "joined" : "idle"}
                    {...reveal}
                    transition={spring}
                    className="mt-3 text-center text-[13px] text-neutral-400"
                  >
                    {joined ? "You're in — your mic is muted." : "Mic will be muted initially."}
                  </motion.p>
                </AnimatePresence>
              </motion.footer>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </LayoutGroup>
  );
}

function Member({
  person,
  open,
  index,
  extra,
  stagger,
}: {
  person: Person;
  open: boolean;
  index: number;
  extra: boolean;
  stagger: number;
}) {
  return (
    <motion.li
      layout
      transition={spring}
      initial={extra ? { opacity: 0, y: 24, scale: 0.6, filter: "blur(8px)" } : false}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={
        extra
          ? { opacity: 0, y: 24, scale: 0.6, filter: "blur(8px)", transition: { duration: 0.18 } }
          : undefined
      }
      style={{ zIndex: 10 - index }}
      className={
        "relative flex flex-col items-center " + (open || index === 0 ? "" : "-ml-1.5")
      }
    >
      <motion.div layout transition={{ ...spring, delay: extra ? stagger * 0.03 : 0 }} className="relative">
        <img
          src={person.src}
          alt={person.name}
          draggable={false}
          className="size-[54px] select-none rounded-full border-[3px] border-white bg-neutral-100 object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.08)]"
        />
        <AnimatePresence initial={false}>
          {open && person.speaking && (
            <motion.span
              key="speaking"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ ...spring, delay: open ? 0.12 : 0 }}
              className="absolute -right-1.5 -top-1 grid size-[22px] place-items-center rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_5px_rgba(0,0,0,0.1)]"
            >
              <Bars className="h-2.5 gap-[1.5px]" bar="w-[1.5px] bg-neutral-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence mode="popLayout" initial={false}>
        {open && (
          <motion.span
            key="name"
            layout="position"
            initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.12 } }}
            transition={{ ...spring, delay: 0.06 + index * 0.015 }}
            className="mt-1 whitespace-nowrap text-[14px] tracking-[-0.01em] text-neutral-600"
          >
            {person.name}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* animated equaliser bars for the "speaking" indicators */
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
