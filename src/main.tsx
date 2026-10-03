import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { Hero } from "./hero/Hero";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Hero />
    </MotionConfig>
  </StrictMode>,
);
