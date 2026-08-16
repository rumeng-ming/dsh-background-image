# dsh-background-image

A **static bundle plugin** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
Web GUI that adds a "背景图 / Background" settings page for customizing the
application background. Installed once, it survives restarts.

> **Unofficial project.** Not affiliated with or endorsed by DeepSeek.
> Tested on DeepSeek Harness `0.1.0-rc.6`.

## Features

- **Gradient presets** — 5 curated gradients, each with light/dark variants
- **Solid colors** — native color picker
- **Image URLs** — any direct image link
- **Local images** — the Host half reads the file (png/jpg/jpeg/webp/gif,
  ≤ 5 MB) and serves it over `/dyn-bgimg/background`, a normal same-origin URL
- **Opacity slider** — background strength 0–100 % keeps text readable
- **Image size controls** — fit window (cover), full display (contain), or a
  custom 30–200 % scale slider
- **Light/dark aware** — separate light and dark values per color scheme

## How it works

One dual-face bundle row (`cordis.patch.yml`):

- **Host half** (`lib/index.js`) — a Cordis plugin (`inject: fs, webServer`)
  registering two HTTP routes: `GET /dyn-bgimg/background` (serve the
  in-memory image) and `POST /dyn-bgimg/load` (read a local image file into
  memory and return its URL).
- **Browser half** (`lib/client.js`) — a `window.__ModuleLoader__.load`
  bundle picked up by the `dsh.client` declaration (platform `web`). It
  registers the settings page, talks to the Host via `fetch`, and renders the
  background on an `html::before` layer at `z-index: -1` (guaranteed below all
  app content). The app frame token (`--dsw-alias-bg-base`) is set to
  `transparent` while a background is active and restored on stop.

## Installation

Requires [pnpm](https://pnpm.io/) (`npm install -g pnpm`).

From this repository (local checkout or after cloning):

```powershell
dsh plugin --profile web add link:C:\path\to\dsh-background-image
```

Or from a published registry package (not yet published):

```powershell
dsh plugin --profile web add dsh-background-image
```

Then **restart DSH**. The "背景图" section appears under Settings, permanently.

Uninstall:

```powershell
dsh plugin --profile web remove dsh-background-image
```

## Configuration

To auto-apply a local image when the page loads, set `DEFAULT_IMAGE` at the
top of `lib/client.js` (e.g. `"C:\\Users\\you\\Desktop\\bg.jpg"`); leave it
empty to disable auto-loading.

## Requirements

- DeepSeek Harness `0.1.0-rc.6` (APIs are unstable pre-1.0; other versions may break)
- A profile providing `fs` and `webServer` on the Host (the shipped `web`
  profile does) and `dsh-client-ui-theme` / `dsh-client-ui-slots` on the Client.

## Repository layout

```
├── package.json           # dsh.bundle + dsh.client declarations
├── cordis.patch.yml       # the bundle's one dual-face row
├── lib/
│   ├── index.js           # Host half
│   └── client.js          # Browser half
└── legacy-dynamic/        # earlier dynamic-plugin source (archived)
```

## License

MIT — see [LICENSE](./LICENSE).
