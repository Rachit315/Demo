import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { SelectionList } from "./SelectionList";
import { ThemeSwitch } from "./ThemeSwitch";
import { SoundSwitch } from "./SoundSwitch";
import { PromptPage } from "./PromptPage";
import "./index.css";

/* the prompt bar is the home page; the voice chat card lives at /#voice */
function useView() {
  const read = () => (window.location.hash === "#voice" ? "voice" : "prompt");
  const [view, setView] = useState(read);
  useEffect(() => {
    const on = () => setView(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return view;
}

function App() {
  const view = useView();

  /* the prompt bar is designed dark-only, so pin the chrome dark there */
  useEffect(() => {
    if (view === "prompt") document.documentElement.dataset.theme = "dark";
  }, [view]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2" data-keep-open>
        <SoundSwitch />
        {view === "voice" && <ThemeSwitch />}
      </div>
      {view === "prompt" ? (
        <PromptPage />
      ) : (
        <main className="grid min-h-full place-items-center px-4 py-16">
          <SelectionList corner={20} rows="4" />
        </main>
      )}
    </MotionConfig>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
