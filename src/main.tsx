import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { SwapCard } from "./swap/SwapCard";
import { ThemeToggle, initialTheme } from "./swap/ThemeToggle";
import "./index.css";

/* set the theme before the first paint so there is no flash */
document.documentElement.dataset.theme = initialTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <main className="grid min-h-dvh grid-cols-[minmax(0,1fr)] place-items-center bg-sw-page px-4 py-10 transition-colors duration-300">
        <SwapCard />
      </main>
    </MotionConfig>
  </StrictMode>,
);
