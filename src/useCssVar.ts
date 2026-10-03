import { useEffect, useState } from "react";

/* Resolved value of a CSS custom property on :root, kept current when the
   theme changes (data-theme attribute or OS colour scheme). */
export function useCssVar(name: string) {
  const read = () => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [value, setValue] = useState(read);

  useEffect(() => {
    const update = () => setValue(read());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [name]);

  return value;
}
