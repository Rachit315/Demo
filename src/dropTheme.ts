export type Theme = "light" | "dark";

/* Colours the drop zone animates between. Motion interpolates these as
   literal values, so they live here rather than in CSS variables. Every
   box-shadow keeps the same four-layer shape so it can tween. */
export type Palette = {
  card: string;
  cardClear: string;
  cardFade: string;
  flash: string;
  flashDeep: string;
  hole: string;
  restShadow: string;
  holeShadow: string;
  ringFirst: string;
  ring: string;
  ringAlpha: number;
  ringStep: number;
  stack: string;
  stackAlpha: number;
  pill: string;
  pillBorder: string;
  text: string;
};

export const palettes: Record<Theme, Palette> = {
  light: {
    card: "#ffffff",
    cardClear: "rgba(255, 255, 255, 0)",
    cardFade: "rgba(255, 255, 255, 0.7)",
    flash: "#bfbfc2",
    flashDeep: "#3b3b3f",
    hole: "#030303",
    restShadow:
      "inset 0 0 0 0px rgba(27, 27, 29, 0), inset 0 0 0 0px rgba(58, 58, 62, 0), 0 22px 44px -18px rgba(0, 10, 60, 0.45), 0 2px 6px rgba(0, 10, 60, 0.12)",
    holeShadow:
      "inset 0 0 0 6px rgba(27, 27, 29, 1), inset 0 0 0 7px rgba(58, 58, 62, 1), 0 30px 60px -20px rgba(0, 0, 20, 0.75), 0 2px 8px rgba(0, 0, 20, 0.35)",
    ringFirst: "rgba(150, 140, 175, 0.75)",
    ring: "160 160 170",
    ringAlpha: 0.6,
    ringStep: 0.04,
    stack: "150 150 160",
    stackAlpha: 0.55,
    pill: "#ffffff",
    pillBorder: "rgba(120, 120, 130, 0.75)",
    text: "#71717a",
  },
  dark: {
    card: "#17181c",
    cardClear: "rgba(23, 24, 28, 0)",
    cardFade: "rgba(23, 24, 28, 0.7)",
    flash: "#4a4b52",
    flashDeep: "#232428",
    hole: "#000000",
    restShadow:
      "inset 0 0 0 0px rgba(40, 41, 47, 0), inset 0 0 0 0px rgba(70, 72, 82, 0), 0 22px 44px -18px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)",
    holeShadow:
      "inset 0 0 0 6px rgba(40, 41, 47, 1), inset 0 0 0 7px rgba(70, 72, 82, 1), 0 30px 70px -18px rgba(60, 110, 255, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.1)",
    ringFirst: "rgba(170, 170, 205, 0.4)",
    ring: "200 200 215",
    ringAlpha: 0.3,
    ringStep: 0.02,
    stack: "200 200 215",
    stackAlpha: 0.28,
    pill: "#1e1f24",
    pillBorder: "rgba(200, 200, 215, 0.45)",
    text: "#a1a1aa",
  },
};
