/* UI sounds, synthesised with the Web Audio API — no audio files. Soft,
   glassy tones that match the card: a rising pop to open, a falling pop to
   close, a two-note chime to join a call and its mirror to leave. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
const listeners = new Set<(on: boolean) => void>();

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  listeners.forEach((fn) => fn(on));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

let noise: AudioBuffer | null = null;

function ensureContext() {
  if (!ctx) {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    /* gentle compressor so stacked tones never clip */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    /* one shared buffer of white noise for every swish */
    const len = Math.ceil(ctx.sampleRate * 0.3);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/* the context is built ahead of the first click (on the first pointer move,
   touch or key press) so creating it never lands on an animation frame */
if (typeof window !== "undefined") {
  const warm = () => {
    if (enabled) ensureContext();
    for (const type of ["pointermove", "pointerdown", "keydown"]) window.removeEventListener(type, warm, true);
  };
  for (const type of ["pointermove", "pointerdown", "keydown"])
    window.addEventListener(type, warm, { capture: true, passive: true });
}

function audio() {
  if (!enabled || typeof window === "undefined") return null;
  const ac = ensureContext();
  if (!ac) return null;
  /* browsers start the context suspended until a user gesture */
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

type ToneOptions = {
  from: number;
  to?: number;
  at?: number; // start offset, seconds
  dur: number; // seconds
  gain: number;
  type?: OscillatorType;
  attack?: number;
};

function tone(ac: AudioContext, { from, to = from, at = 0, dur, gain, type = "sine", attack = 0.006 }: ToneOptions) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/* a short band-passed noise swish — the "air" moving as the card morphs */
function swish(ac: AudioContext, { from, to, dur, gain }: { from: number; to: number; dur: number; gain: number }) {
  if (!noise) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(from, t);
  band.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band).connect(env).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sounds = {
  /* pill → card: rising glassy pop with a sparkle on top */
  open() {
    const ac = audio();
    if (!ac) return;
    swish(ac, { from: 900, to: 3200, dur: 0.22, gain: 0.05 });
    tone(ac, { from: 420, to: 760, dur: 0.16, gain: 0.32 });
    tone(ac, { from: 1520, at: 0.05, dur: 0.18, gain: 0.06 });
  },
  /* card → pill: the same gesture played backwards, slightly lower */
  close() {
    const ac = audio();
    if (!ac) return;
    swish(ac, { from: 2600, to: 700, dur: 0.2, gain: 0.04 });
    tone(ac, { from: 700, to: 360, dur: 0.15, gain: 0.3 });
    tone(ac, { from: 160, to: 110, dur: 0.12, gain: 0.12 });
  },
  /* joined the call: two bright notes up a fifth, like a channel join */
  join() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { from: 587.33, dur: 0.32, gain: 0.22, type: "triangle" });
    tone(ac, { from: 1174.66, dur: 0.22, gain: 0.04 });
    tone(ac, { from: 880, at: 0.09, dur: 0.42, gain: 0.24, type: "triangle" });
    tone(ac, { from: 1760, at: 0.09, dur: 0.3, gain: 0.05 });
  },
  /* left the call: the chime mirrored downward */
  leave() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { from: 880, dur: 0.28, gain: 0.2, type: "triangle" });
    tone(ac, { from: 587.33, at: 0.09, dur: 0.38, gain: 0.22, type: "triangle" });
  },
  /* a soft keystroke tap; pitch wanders a little so typing never drones */
  key() {
    const ac = audio();
    if (!ac) return;
    const f = 2100 + Math.random() * 500;
    tone(ac, { from: f, to: f * 0.7, dur: 0.035, gain: 0.035, attack: 0.002 });
  },
  /* prompt sent: a quick upward swish with a low thump underneath */
  submit() {
    const ac = audio();
    if (!ac) return;
    swish(ac, { from: 600, to: 4200, dur: 0.32, gain: 0.06 });
    tone(ac, { from: 220, to: 440, dur: 0.18, gain: 0.22 });
  },
  /* generation finished: a bright two-note confirmation */
  done() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { from: 783.99, dur: 0.24, gain: 0.18, type: "triangle" });
    tone(ac, { from: 1174.66, at: 0.08, dur: 0.36, gain: 0.2, type: "triangle" });
  },
  /* tiny tick for small toggles */
  tick() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { from: 1800, to: 1400, dur: 0.045, gain: 0.08, attack: 0.002 });
  },
};
