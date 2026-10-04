import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { SwapCard } from "./swap/SwapCard";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <main className="grid min-h-dvh grid-cols-[minmax(0,1fr)] place-items-center bg-sw-page px-4 py-10">
        <SwapCard />
      </main>
    </MotionConfig>
  </StrictMode>,
);
