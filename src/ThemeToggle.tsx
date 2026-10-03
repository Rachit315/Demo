import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import type { Theme } from "./dropTheme";

/* light / dark segmented switch; the thumb slides between the two */
export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", Icon: Sun },
    { value: "dark", label: "Dark theme", Icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative flex gap-0.5 rounded-full border border-[var(--dz-toggle-line)] bg-[var(--dz-toggle-bg)] p-[3px] shadow-[0_6px_16px_-8px_rgb(0_0_0/0.35)] backdrop-blur-md transition-colors duration-300"
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
            onClick={() => onChange(value)}
            className={
              "relative grid size-8 cursor-pointer place-items-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--dz-toggle-ink)] " +
              (active ? "text-[var(--dz-toggle-ink)]" : "text-[var(--dz-toggle-muted)] hover:text-[var(--dz-toggle-ink)]")
            }
          >
            {active && (
              <motion.span
                layoutId="dz-theme-thumb"
                className="absolute inset-0 rounded-full bg-[var(--dz-toggle-thumb)] shadow-[0_1px_3px_rgb(0_0_0/0.2)]"
                transition={{ type: "spring", visualDuration: 0.35, bounce: 0.25 }}
              />
            )}
            <motion.span
              className="relative"
              initial={false}
              animate={{ rotate: active ? 0 : value === "light" ? -45 : 30, scale: active ? 1 : 0.88 }}
              transition={{ type: "spring", visualDuration: 0.4, bounce: 0.3 }}
            >
              <Icon className="size-4" strokeWidth={2} />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
