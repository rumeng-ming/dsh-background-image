# dsh-background-image

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/rumeng-ming/dsh-background-image/actions/workflows/ci.yml/badge.svg)](https://github.com/rumeng-ming/dsh-background-image/actions/workflows/ci.yml)
[![DSH](https://img.shields.io/badge/DeepSeek%20Harness-0.1.0--rc.6-3964fe)](https://github.com/deepseek-ai/deepseek-harness)
[![Status](https://img.shields.io/badge/status-stable-brightgreen)](#)

A **static bundle plugin** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
Web GUI that adds a "背景图 / Background" settings page for customizing the
application background. Installed once, it survives restarts — and remembers
your last background across them.

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
- **Persistence** — the last background is saved through the DSH `settings`
  service and restored automatically after a restart

## How it works

One dual-face bundle row (`cordis.patch.yml`):

- **Host half** (`lib/index.js`) — a Cordis plugin (`inject: fs, webServer`)
  registering four HTTP routes: `GET /dyn-bgimg/background` (serve the
  in-memory image), `POST /dyn-bgimg/load` (read a local image file into
  memory and return its URL), and `POST /dyn-bgimg/save` +
  `GET /dyn-bgimg/state` (persist/restore the last background through the
  `settings` service; falls back to in-memory storage without a settings
  provider).
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
# 1. Install the plugin's own dependencies (schemastery)
cd C:\path\to\dsh-background-image
npm install

# 2. Link it into the web profile
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

To auto-apply a local image on **first** launch (before any background has been
saved), set `DEFAULT_IMAGE` at the top of `lib/client.js` (e.g.
`"C:\\Users\\you\\Desktop\\bg.jpg"`); leave it empty to disable auto-loading.
Once a background is applied, it is persisted and takes precedence.

## Requirements

- DeepSeek Harness `0.1.0-rc.6` (APIs are unstable pre-1.0; other versions may break)
- A profile providing `fs` and `webServer` on the Host (the shipped `web`
  profile does) and `dsh-client-ui-theme` / `dsh-client-ui-conversation` on the Client.

## Development

```powershell
npm test      # unit tests (node:test, no extra dependencies)
npm run check # syntax check for every module
```

The tests cover the shared pure logic in `lib/logic.js` (path validation,
save/restore mapping), the Host half's four HTTP routes against mocked
`fs`/`webServer`/`settings` services, and the browser half's real bundle
(loaded in a Node `vm` sandbox with a fake DOM) including the size mode,
opacity clamping, CSS construction, restore flow, and cleanup on dispose.

CI runs `npm run check` + `npm test` on Node 18/20/22 for every push to
`main` and every pull request.

## Repository layout

```
├── package.json           # dsh.bundle + dsh.client declarations
├── cordis.patch.yml       # the bundle's one dual-face row
├── CHANGELOG.md
├── lib/
│   ├── index.js           # Host half (image routes + settings persistence)
│   ├── logic.js           # shared pure logic (validation + state mapping)
│   └── client.js          # Browser half (settings page + restore)
├── test/                  # unit + integration tests (node:test)
├── .github/workflows/     # CI (syntax check + tests, Node 18/20/22)
└── legacy-dynamic/        # earlier dynamic-plugin source (archived)
```

## License

MIT — see [LICENSE](./LICENSE).
