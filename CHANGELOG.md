# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Background persistence: the last applied background (preset, color, image URL,
  or local image path) is saved through the DSH `settings` service and restored
  automatically after a restart.

### Changed

- Image size controls (fit window / full display / custom scale) are now always
  visible in the settings page; they are disabled with a hint until an image
  background is applied.

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
