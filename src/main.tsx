import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig, motion } from "motion/react";
import { DropZone, type DropZoneHandle, type Phase } from "./DropZone";
import { DemoFile } from "./DemoFile";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "./dropTheme";
import "./index.css";

/* an explicit data-theme on <html> (from the host page) wins; otherwise
   the page opens in light, the look of the original video */
function initialTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [phase, setPhase] = useState<Phase>("idle");
  const zone = useRef<DropZoneHandle>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle theme={theme} onChange={setTheme} />
      </div>
      <main className="streaks grid min-h-full grid-cols-[minmax(0,1fr)] place-items-center overflow-hidden px-4 py-16">
        <motion.section
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", visualDuration: 0.6, bounce: 0.15 }}
          className="panel relative flex w-full min-w-0 max-w-[560px] flex-col items-center rounded-[6px] px-4 pb-6 pt-8 sm:aspect-square"
        >
          <header className="mb-12 w-full max-w-[380px] select-none">
            <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--dz-title)] transition-colors duration-300">
              Dynamic drop-zone
            </h1>
            <p className="mt-2 text-[16px] text-[var(--dz-sub)] transition-colors duration-300">
              Magnetic black hole drop zone
            </p>
          </header>
          <div className="h-[280px] w-[380px] shrink-0 origin-top max-sm:-mb-14 max-sm:scale-[0.8]">
            <DropZone ref={zone} theme={theme} onPhaseChange={setPhase} />
          </div>
          <div className="mt-auto w-full max-w-[380px] pt-8 max-sm:pt-4">
            <DemoFile zone={zone} available={phase === "idle"} />
          </div>
        </motion.section>
      </main>
    </MotionConfig>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
