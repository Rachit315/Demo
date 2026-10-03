import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { SelectionList } from "./SelectionList";
import { ThemeSwitch } from "./ThemeSwitch";
import { SoundSwitch } from "./SoundSwitch";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2" data-keep-open>
        <SoundSwitch />
        <ThemeSwitch />
      </div>
      <main className="grid min-h-full place-items-center px-4 py-16">
        <SelectionList corner={20} rows="4" />
      </main>
    </MotionConfig>
  </StrictMode>,
);
