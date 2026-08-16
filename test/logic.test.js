// Unit tests for the shared pure logic (lib/logic.js).
// Run with: npm test
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  MAX_BYTES,
  MIME,
  parseImagePath,
  normalizeSaveState,
  sanitizeSavedState
} from "../lib/logic.js"

// ── constants ────────────────────────────────────────────────────────────────

test("MAX_BYTES enforces the 5 MB local image limit", () => {
  assert.equal(MAX_BYTES, 5 * 1024 * 1024)
})

test("MIME map covers exactly the whitelisted formats", () => {
  assert.deepEqual(MIME, {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif"
  })
})

// ── path validation ──────────────────────────────────────────────────────────

test("parseImagePath accepts every whitelisted extension", () => {
  for (const [ext, mime] of Object.entries(MIME)) {
    assert.deepEqual(parseImagePath("C:\\pics\\bg." + ext), { ext, mime })
    assert.deepEqual(parseImagePath("bg." + ext), { ext, mime })
  }
})

test("parseImagePath is case-insensitive on the extension", () => {
  assert.deepEqual(parseImagePath("C:\\pics\\BG.PNG"), { ext: "png", mime: "image/png" })
  assert.deepEqual(parseImagePath("photo.JpEg"), { ext: "jpeg", mime: "image/jpeg" })
})

test("parseImagePath rejects paths without an extension", () => {
  assert.throws(() => parseImagePath("C:\\pics\\background"), /无法识别文件类型/)
  assert.throws(() => parseImagePath(""), /无法识别文件类型/)
  assert.throws(() => parseImagePath("C:\\pics\\bg."), /无法识别文件类型/)
})

test("parseImagePath rejects unsupported extensions", () => {
  for (const bad of ["bg.bmp", "bg.svg", "bg.exe", "bg.txt", "bg.tar.gz"]) {
    assert.throws(() => parseImagePath(bad), /仅支持 png\/jpg\/jpeg\/webp\/gif/)
  }
})

// ── save mapping (normalizeSaveState) ────────────────────────────────────────

test("normalizeSaveState applies defaults for missing or mistyped fields", () => {
  assert.deepEqual(normalizeSaveState({}), {
    kind: "none", desc: "", strength: 55, size: "cover", light: "", dark: ""
  })
  assert.deepEqual(normalizeSaveState({ kind: 42, strength: "80" }), {
    kind: "none", desc: "", strength: 55, size: "cover", light: "", dark: ""
  })
})

test("normalizeSaveState passes through well-formed values", () => {
  const input = {
    kind: "gradient",
    desc: "预设 · 极光紫",
    strength: 80,
    size: "cover",
    light: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    dark: "linear-gradient(135deg, #3b4a8f 0%, #6d4a9e 100%)"
  }
  assert.deepEqual(normalizeSaveState(input), input)
})

test("normalizeSaveState coerces size to a string", () => {
  assert.equal(normalizeSaveState({ size: 150 }).size, "150")
  assert.equal(normalizeSaveState({ size: "contain" }).size, "contain")
  assert.equal(normalizeSaveState({ size: null }).size, "cover")
  assert.equal(normalizeSaveState({ size: undefined }).size, "cover")
})

test("normalizeSaveState keeps imagePath only when it is a non-empty string", () => {
  assert.equal(normalizeSaveState({ kind: "image", imagePath: "C:\\pics\\bg.png" }).imagePath, "C:\\pics\\bg.png")
  assert.equal("imagePath" in normalizeSaveState({ kind: "image", imagePath: "" }), false)
  assert.equal("imagePath" in normalizeSaveState({ kind: "image", imagePath: 42 }), false)
  assert.equal("imagePath" in normalizeSaveState({ kind: "image" }), false)
})

// ── restore mapping (sanitizeSavedState) ─────────────────────────────────────

test("sanitizeSavedState returns null when nothing was saved", () => {
  assert.equal(sanitizeSavedState(null), null)
  assert.equal(sanitizeSavedState(undefined), null)
  assert.equal(sanitizeSavedState({ kind: "none" }), null)
  assert.equal(sanitizeSavedState({}), null)
})

test("sanitizeSavedState restores saved fields unchanged", () => {
  const saved = {
    kind: "gradient",
    desc: "预设 · 海风蓝",
    strength: 60,
    size: "cover",
    light: "light-value",
    dark: "dark-value"
  }
  assert.deepEqual(sanitizeSavedState(saved), saved)
})

test("sanitizeSavedState fills defaults for missing fields", () => {
  assert.deepEqual(sanitizeSavedState({ kind: "color", light: "#f00" }), {
    kind: "color", desc: "", strength: 55, size: "cover", light: "#f00", dark: ""
  })
})

test("sanitizeSavedState keeps imagePath only when it is a non-empty string", () => {
  assert.equal(sanitizeSavedState({ kind: "image", imagePath: "C:\\pics\\bg.png" }).imagePath, "C:\\pics\\bg.png")
  assert.equal("imagePath" in sanitizeSavedState({ kind: "image", imagePath: "" }), false)
})

// ── round-trip ───────────────────────────────────────────────────────────────

test("save → restore round-trip is lossless for every kind", () => {
  const states = [
    { kind: "gradient", desc: "预设 · 墨色", strength: 45, size: "cover", light: "l1", dark: "d1" },
    { kind: "color", desc: "纯色 #667eea", strength: 100, size: "cover", light: "#667eea", dark: "#667eea" },
    { kind: "image", desc: "本地图片", strength: 70, size: "150", light: "l2", dark: "d2", imagePath: "C:\\pics\\bg.webp" }
  ]
  for (const state of states) {
    const saved = normalizeSaveState(state)
    assert.deepEqual(sanitizeSavedState(saved), saved, "round-trip of " + state.kind)
  }
})
