import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", Icon: Sun },
    { value: "dark", label: "Dark theme", Icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative flex gap-0.5 rounded-full bg-surface p-[3px] shadow-[0_0_0_1px_var(--line),0_4px_12px_-6px_rgb(0_0_0/0.18)]"
    >
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={
              "relative grid size-8 cursor-pointer place-items-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-subtle " +
              (active ? "text-ink" : "text-subtle hover:text-muted")
            }
          >
            {active && (
              <motion.span
                layoutId="theme-thumb"
                className="absolute inset-0 rounded-full bg-chip"
                transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
              />
            )}
            <motion.span
              className="relative"
              initial={false}
              animate={{ rotate: active ? 0 : value === "light" ? -45 : 30, scale: active ? 1 : 0.88 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            >
              <Icon className="size-4" strokeWidth={2} />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
