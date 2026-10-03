import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig, motion } from "motion/react";
import { DropZone } from "./DropZone";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <main className="streaks grid min-h-full grid-cols-[minmax(0,1fr)] justify-items-center place-items-center overflow-hidden px-4 py-12">
        <motion.section
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", visualDuration: 0.6, bounce: 0.15 }}
          className="panel relative flex w-full min-w-0 max-w-[560px] flex-col items-center rounded-[6px] px-4 pb-24 pt-8 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] sm:aspect-square sm:pb-0"
        >
          <header className="mb-14 w-full max-w-[380px] select-none">
            <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-white/80">Dynamic drop-zone</h1>
            <p className="mt-2 text-[16px] text-white/30">Magnetic black hole drop zone</p>
          </header>
          <div className="w-[380px] shrink-0 origin-top max-sm:scale-[0.8]">
            <DropZone />
          </div>
        </motion.section>
      </main>
    </MotionConfig>
  </StrictMode>,
);
