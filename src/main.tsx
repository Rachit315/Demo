import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { SelectionList } from "./SelectionList";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <main className="grid min-h-full place-items-center p-4">
        <SelectionList corner={20} rows="4" />
      </main>
    </MotionConfig>
  </StrictMode>,
);
