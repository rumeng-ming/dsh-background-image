# dsh-background-image

A dynamic [Cordis](https://github.com/cordisjs/cordis) plugin for the
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI
that lets you customize the application background from a settings page.

> **Unofficial project.** Not affiliated with or endorsed by DeepSeek. Tested
> on DeepSeek Harness `0.1.0-rc.6`.

## Features

- **Gradient presets** — 5 curated gradients, each with light/dark variants
- **Solid colors** — native color picker
- **Image URLs** — any direct image link
- **Local images** — the Host half reads the file (png/jpg/jpeg/webp/gif,
  ≤ 5 MB) and serves it over a package-registered HTTP route
  (`/dyn-bgimg/background`), so the browser loads it as a normal same-origin URL
- **Opacity slider** — background strength 0–100 % keeps text readable
- **Image size controls** — fit window (cover), full display (contain), or a
  custom 30–200 % scale slider
- **Light/dark aware** — separate light and dark values, switching with the
  active color scheme

## What "dynamic plugin" means

This plugin runs as a **temporary in-process extension**: it is defined and
activated inside a running DSH session and **does not survive a process
restart**. That is by design of the dynamic-plugin mechanism, not a bug.

This repository stores the plugin source (`host.js` + `client.js`) in readable
form. To activate it inside DSH, ask your agent:

> 帮我加载 C:\Users\92991\dsh-plugins 里的 background-image 插件

or paste the contents of `host.js` / `client.js` into the DSH dynamic-plugin
panel (`cordis_define` + `cordis_run`).

## Repository layout

```
├── README.md
├── LICENSE
└── background-image/
    ├── README.md          # usage & configuration
    ├── host.js            # Host half (image reader + HTTP route)
    └── client.js          # Client half (settings page)
```

## Configuration

`background-image/host.js` and `background-image/client.js` each declare a
`DEFAULT_IMAGE` constant:

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

## Requirements

- DeepSeek Harness `0.1.0-rc.6` (APIs are unstable pre-1.0; other versions may break)
- Host composition providing `fs` and `webServer` (the shipped composition does)

## Known limitations

- Dynamic plugins do not persist: re-apply the background after a reload.
- Remote image URLs may be blocked by hotlink protection; prefer local paths.

## License

MIT — see [LICENSE](./LICENSE).
