# Dynamic drop-zone

A magnetic "black hole" file drop zone built with React, Tailwind CSS and Motion.

Drag the demo file (or any file from your desktop) onto the card: it turns into a
black hole whose rings lean towards your cursor while debris spirals in. Drop it
and the hole collapses into an upload pill, shows a check, then resets.
Use the switch in the top-right corner for light or dark theme.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Build for production

```bash
npm run build     # type-checks, then writes the site to dist/
npm run preview   # serves dist/ on http://localhost:3000
```

## Where things are

- `src/DropZone.tsx` – the drop zone and all of its animation
- `src/DemoFile.tsx` – the draggable demo file and its drag image
- `src/ThemeToggle.tsx`, `src/dropTheme.ts` – theme switch and colours
- `src/main.tsx` – the page layout
