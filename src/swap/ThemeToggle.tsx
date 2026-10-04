import { useEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { morph } from "./motion";

type Theme = "light" | "dark";
const KEY = "swap-theme";

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage can be blocked; fall back to the system setting */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const reduce = useReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* not critical */
    }
  }, [theme]);

  /* the new theme spreads out as a circle from the button that was pressed */
  const choose = (next: Theme, e: MouseEvent<HTMLButtonElement>) => {
    if (next === theme) return;
    const root = document.documentElement;
    const doc = document as ViewTransitionDoc;
    const apply = () => {
      root.dataset.theme = next;
      flushSync(() => setTheme(next));
    };
    if (!doc.startViewTransition || reduce) return apply();

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    root.classList.add("theme-switching");
    const t = doc.startViewTransition(apply);
    t.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
    t.finished.finally(() => root.classList.remove("theme-switching"));
  };

  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", Icon: Sun },
    { value: "dark", label: "Dark theme", Icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex gap-0.5 rounded-full bg-sw-card p-[3px] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_14px_-6px_rgb(0_0_0/0.18)] transition-colors duration-300"
    >
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <motion.button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={(e) => choose(value, e)}
            whileTap={{ scale: 0.88 }}
            transition={morph}
            className={
              "relative grid size-7 cursor-pointer place-items-center rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-sw-accent " +
              (active ? "text-sw-ink" : "text-sw-faint hover:text-sw-muted")
            }
          >
            {active && (
              <motion.span layoutId="theme-thumb" transition={morph} className="absolute inset-0 rounded-full bg-sw-chip" />
            )}
            <motion.span
              className="relative grid place-items-center"
              initial={false}
              animate={{ rotate: active ? 0 : value === "light" ? -90 : 40, scale: active ? 1 : 0.82 }}
              transition={{ type: "spring", visualDuration: 0.45, bounce: 0.35 }}
            >
              <Icon className="size-[15px]" strokeWidth={2} />
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}
