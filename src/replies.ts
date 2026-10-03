/* Canned replies for the demo. No model is connected: these are shaped from
   the prompt so the conversation flow (thinking, streaming, stop) can be
   exercised end to end. */

export type Tool = "image" | "research" | null;

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function draftReply(prompt: string, tool: Tool, files: string[]): string {
  const p = prompt.trim().replace(/\s+/g, " ");
  const topic = p.length > 60 ? p.slice(0, 57) + "…" : p;
  const lower = p.toLowerCase();
  const parts: string[] = [];

  if (files.length) {
    parts.push(
      `I can see ${files.length === 1 ? "one attachment" : `${files.length} attachments`} (${files.join(", ")}). This demo doesn't read file contents, so I'll work from your message.`,
    );
  }

  if (tool === "image") {
    parts.push(
      `Here's a visual direction for "${topic}":`,
      [
        "• Ground: near-black, with a faint grid so the frame has structure without noise.",
        "• Light: one hot red source, placed off-centre and bleeding softly into the dark.",
        "• Type: a clean grotesk in white, fading to grey as it moves away from the light.",
        "• Detail: a few red specks drifting in the glow, like dust in a beam.",
      ].join("\n"),
      "I've sketched a concept frame below. Tell me what to push: more contrast, a warmer red, or a calmer composition.",
    );
    return parts.join("\n\n");
  }

  if (tool === "research") {
    parts.push(
      `Here's how I'd research "${topic}":`,
      [
        "1. Frame the question: who it's for, what decision it informs, and by when.",
        "2. Map what's known: existing work, competitors, and the vocabulary people actually use.",
        "3. Gather evidence: interviews, usage data, and a short survey to size what you hear.",
        "4. Synthesise: cluster findings into three to five themes, each with a clear implication.",
        "5. Recommend: one direction, the trade-offs, and what you'd test first.",
      ].join("\n"),
      "Want me to turn step 3 into an interview guide?",
    );
    return parts.join("\n\n");
  }

  if (/\b(brand|logo|identity|name)\b/.test(lower)) {
    parts.push(
      `Good brief. A first pass at "${topic}":`,
      [
        "• Positioning: say what you do in one sentence a customer would repeat.",
        "• Voice: confident and plain. Short sentences, specific verbs, no filler.",
        "• Visuals: dark ground, one signal colour, generous space. Let the red do the talking.",
        "• System: define tokens for colour, type and motion first, then design screens from them.",
      ].join("\n"),
      "Should I draft three tagline options next?",
    );
  } else if (/\b(code|bug|react|css|function|api)\b/.test(lower)) {
    parts.push(
      `Let's break down "${topic}".`,
      "Start by reproducing it in the smallest possible case. Once it fails reliably, change one thing at a time and keep the failing case as a test so it can't come back.",
      "Paste the relevant snippet and the exact error, and I'll walk through it line by line.",
    );
  } else {
    parts.push(
      pick([
        `Here's a first take on "${topic}".`,
        `Happy to help with "${topic}".`,
        `Let's dig into "${topic}".`,
      ]),
      "The quickest way forward is to pin down the outcome you want, list what's in the way, and tackle the smallest piece that unblocks the rest.",
      "Tell me a bit more about the context and I'll make this specific.",
    );
  }
  return parts.join("\n\n");
}
