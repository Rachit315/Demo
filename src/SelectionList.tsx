import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, type Transition } from "motion/react";
import { Liquid } from "liquid-gooey";
import { ChevronDown, X } from "lucide-react";
import { people, type Person } from "./people";
import { useCssVar } from "./useCssVar";

type SelectionListProps = {
  /* corner — 0 to 40px, radius of the open card */
  corner?: number;
  /* how many people are shown on the collapsed pill */
  rows?: "2" | "3" | "4";
};

const spring: Transition = { type: "spring", duration: 0.5, bounce: 0.16 };
const soft: Transition = { type: "spring", duration: 0.42, bounce: 0 };

const CARD_W = 300;
const PILL_RADIUS = 32;
const STAGE_H = 320;

export function SelectionList({ corner = 20, rows = "4" }: SelectionListProps) {
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const liquidShadow = useCssVar("--liquid-shadow");

  const visible = Number(rows);
  const hidden = people.length - visible;
  const radius = Math.min(40, Math.max(0, corner));

  /* return focus to the pill after a keyboard or close-button dismissal */
  const refocus = useRef(false);
  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const close = (returnFocus: boolean) => {
    refocus.current = returnFocus;
    setOpen(false);
  };

  /* close on Escape or a click outside (page chrome marked data-keep-open,
     like the theme switch, doesn't count as outside) */
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
    <LayoutGroup>
      <div ref={rootRef} className="relative">
        <Liquid
          fill="var(--surface)"
          shadow={liquidShadow}
          blur={7}
          contrast={18}
          filterPadding={48}
          className="flex items-center justify-center"
          style={{ width: CARD_W, height: STAGE_H }}
        >
          {/* the stage keeps the liquid group's origin fixed; this wrapper hugs
              the surface so the badge can sit on its corner */}
          <div className="relative">
          {/* the surface: a liquid blob that springs between pill and card,
              its content cross-blurring while the shape is in motion */}
          <Liquid.Item morph={{ shape: true, bounce: 0.35, speed: 1.1, contentBlur: 6 }}>
            <div
              ref={triggerRef}
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
                "group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-subtle " +
                (open ? "" : "cursor-pointer")
              }
              style={{ width: open ? CARD_W : undefined, borderRadius: open ? radius : PILL_RADIUS }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {open && (
                  <motion.header
                    key="header"
                    layout="position"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                    transition={soft}
                    className="relative flex h-9 items-center justify-center border-b border-line bg-surface-2"
                    style={{ width: CARD_W }}
                  >
                    <span className="text-[14px] font-medium tracking-[-0.01em] text-muted">Voice Chat</span>
                    <motion.button
                      type="button"
                      aria-label="Close"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.88 }}
                      transition={soft}
                      onClick={(e) => {
                        e.stopPropagation();
                        close(true);
                      }}
                      className="absolute right-2 grid size-[22px] cursor-pointer place-items-center rounded-full bg-chip text-subtle transition-colors hover:bg-chip-hover hover:text-muted focus-visible:outline-2 focus-visible:outline-subtle"
                    >
                      <X className="size-3" strokeWidth={2.75} />
                    </motion.button>
                  </motion.header>
                )}
              </AnimatePresence>

              <ul
                className={open ? "grid grid-cols-4 gap-y-3.5 px-3 pt-4" : "flex items-center py-1.5 pl-1.5 pr-3.5"}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {people.map((p, i) =>
                    i < visible || open ? (
                      <Member key={p.id} person={p} open={open} index={i} extra={i >= visible} order={i - visible} />
                    ) : null,
                  )}

                  {!open && hidden > 0 && (
                    <motion.li
                      key="more"
                      layout="position"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, transition: { duration: 0.1 } }}
                      transition={soft}
                      className="ml-2 flex items-center gap-0.5 text-[15px] tabular-nums text-subtle transition-colors group-hover:text-muted"
                    >
                      +{hidden}
                      <ChevronDown
                        className="size-[15px] transition-transform duration-300 group-hover:translate-y-px"
                        strokeWidth={2.25}
                      />
                    </motion.li>
                  )}
                </AnimatePresence>
              </ul>

              <AnimatePresence mode="popLayout" initial={false}>
                {open && (
                  <motion.footer
                    key="footer"
                    layout="position"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10, transition: { duration: 0.12 } }}
                    transition={{ ...spring, delay: 0.05 }}
                    className="px-3.5 pb-3.5 pt-5"
                    style={{ width: CARD_W }}
                  >
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      transition={soft}
                      onClick={() => setJoined((j) => !j)}
                      style={{
                        background: "linear-gradient(180deg, var(--btn-top) 0%, var(--btn-bottom) 100%)",
                        color: "var(--btn-text)",
                        boxShadow: "0 8px 16px -8px var(--btn-shadow), inset 0 1px 0 rgb(255 255 255 / 0.14)",
                      }}
                      className="relative grid h-10 w-full cursor-pointer place-items-center overflow-hidden rounded-[11px] text-[14px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subtle"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={joined ? "leave" : "join"}
                          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
                          transition={soft}
                        >
                          {joined ? "Leave Chat" : "Join Now"}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                    <div className="relative mt-2.5 h-4 overflow-hidden text-center text-[12px] text-subtle">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.p
                          key={joined ? "joined" : "idle"}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={soft}
                        >
                          {joined ? "You're in. Your mic is muted." : "Mic will be muted initially."}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </motion.footer>
                )}
              </AnimatePresence>
            </div>
          </Liquid.Item>

          {/* live-audio badge: its blob is glued to the pill by the goo, and on
              open it slides into the header and melts into the card surface */}
          <Liquid.Item observe>
            <motion.div
              layout
              transition={spring}
              initial={false}
              animate={{ scale: open ? 0.5 : 1 }}
              className={
                "pointer-events-none absolute z-20 grid size-[36px] place-items-center rounded-full " +
                (open ? "left-[1px] top-0" : "-left-[9px] -top-[9px]")
              }
            >
              <motion.div
                initial={false}
                animate={{ opacity: open ? 0 : 1 }}
                transition={{ duration: open ? 0.16 : 0.3, delay: open ? 0 : 0.15 }}
                className="grid size-[28px] place-items-center rounded-full bg-badge"
              >
                <Bars className="h-3 gap-[2px]" bar="w-[2px] bg-badge-ink" />
              </motion.div>
            </motion.div>
          </Liquid.Item>
          </div>
        </Liquid>
      </div>
    </LayoutGroup>
  );
}

function Member({
  person,
  open,
  index,
  extra,
  order,
}: {
  person: Person;
  open: boolean;
  index: number;
  extra: boolean;
  order: number;
}) {
  return (
    <motion.li
      layout
      transition={extra ? { ...spring, delay: order * 0.035 } : spring}
      initial={extra ? { opacity: 0, y: 18, scale: 0.7 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={extra ? { opacity: 0, y: 14, scale: 0.7, transition: { duration: 0.14 } } : undefined}
      style={{ zIndex: 10 - index }}
      className={"relative flex flex-col items-center " + (open || index === 0 ? "" : "-ml-1.5")}
    >
      <motion.div layout transition={spring} className="relative">
        <motion.img
          src={person.src}
          alt={person.name}
          draggable={false}
          whileHover={open ? { y: -2 } : undefined}
          transition={soft}
          className="size-[46px] select-none rounded-full border-[2.5px] border-surface bg-chip object-cover shadow-[0_0_0_1px_var(--ring),0_2px_5px_rgb(0_0_0/0.08)]"
        />
        <AnimatePresence initial={false}>
          {open && person.speaking && (
            <motion.span
              key="speaking"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.3, transition: { duration: 0.1 } }}
              transition={{ ...spring, delay: 0.14 }}
              className="absolute -right-1.5 -top-1 grid size-[19px] place-items-center rounded-full bg-surface shadow-[0_0_0_1px_var(--ring),0_2px_4px_rgb(0_0_0/0.1)]"
            >
              <Bars className="h-2 gap-[1.5px]" bar="w-[1.5px] bg-muted" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence mode="popLayout" initial={false}>
        {open && (
          <motion.span
            key="name"
            layout="position"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ ...soft, delay: 0.08 + index * 0.012 }}
            className="mt-1 whitespace-nowrap text-[13px] tracking-[-0.01em] text-muted"
          >
            {person.name}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* animated equaliser bars for the speaking indicators */
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
