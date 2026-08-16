# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Background persistence: the last applied background (preset, color, image URL,
  or local image path) is saved through the DSH `settings` service and restored
  automatically after a restart.
- Unit and integration tests (`node:test`, run with `npm test`): path
  validation, save/restore state mapping, size modes, opacity clamping, CSS
  construction, the four Host HTTP routes, and the browser restore/cleanup
  flow.
- GitHub Actions CI (`.github/workflows/ci.yml`): syntax check + tests on
  Node 18/20/22 for every push and pull request.
- Optional directory whitelist for local images (`ALLOWED_DIRS` in
  `lib/index.js`, empty by default): restricts `POST /dyn-bgimg/load` to
  configured directories, case-insensitive, with `..` segments collapsed.
- README screenshot (`docs/screenshot.jpg`) showing the Aurora gradient preset.

### Changed

- Image size controls (fit window / full display / custom scale) are now always
  visible in the settings page; they are disabled with a hint until an image
  background is applied.
- Shared pure logic extracted into `lib/logic.js` (zero dependencies) and the
  browser half's pure helpers (`sizeOf`, opacity clamp, CSS builder) factored
  out for testability; runtime behavior is unchanged.

## [0.1.0] - 2026-08-16

### Added

- Static dual-face bundle plugin (`dsh.bundle.patch` + `dsh.client`), installed
  with `dsh plugin --profile web add <pkg>` and surviving restarts.
- Host half: `GET /dyn-bgimg/background` (image serving) and
  `POST /dyn-bgimg/load` (local image reading, ≤ 5 MB, whitelisted formats).
- Browser half: settings page with 5 gradient presets (light/dark variants),
  solid colors, image URLs, local images, an opacity slider, and image size
  controls (cover / contain / custom 30–200 %).

### Fixed

- `exports.inject` now declares service names (`theme`, `slots`) so Cordis
  waits for the services instead of failing on `ctx` property access.
- Host half declares `inject: ["fs", "webServer"]` so routes register after
  the services are available instead of bailing out early.
- Theme is read from `props.theme` (the second React function-component
  argument is context, not a custom prop).
- Client module factory wrapped in try/catch: any failure degrades to a no-op
  module instead of blocking the Web UI boot gate.

### Removed

- Legacy dynamic-plugin sources moved to `legacy-dynamic/` (archived).
