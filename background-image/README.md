# background-image

Adds a "背景图 / Background" settings page to the DeepSeek Harness Web GUI for
customizing the app background.

## Features

- **Gradient presets** — 5 curated gradients, each with light/dark variants
- **Solid colors** — native color picker
- **Image URLs** — any direct image link
- **Local images** — Host reads the file (png/jpg/jpeg/webp/gif, ≤ 5 MB) and
  serves it over a package-registered HTTP route
  (`/dyn-bgimg/background`), so the browser loads it as a normal same-origin URL
- **Opacity slider** — background strength 0–100 % (keeps text readable)
- **Image size controls** — fit window (cover), full display (contain), or a
  custom 30–200 % scale slider

## Configuration

`host.js` and `client.js` each declare a `DEFAULT_IMAGE` constant:

```js
// Set to a local image path to auto-apply it on activation;
// leave empty to disable auto-loading.
const DEFAULT_IMAGE = ''
```

## How it renders

The background is drawn on an `html::before` layer at `z-index: -1` — the root
stacking context guarantees it sits above the canvas background and below all
app content. The app frame background token (`--dsw-alias-bg-base`) is set to
`transparent` while a background is active, and restored when the plugin stops.

## Installation

1. Copy `host.js` and `client.js` into a dynamic-plugin Package
   (`cordis_define` + `cordis_run`), or ask your DSH agent to load this folder.
2. Approve the Client half when prompted.

## Notes

- Dynamic plugins do not persist: re-apply the background after a reload.
- Remote URLs may be blocked by hotlink protection; prefer local paths.
