// dsh-background-image — shared pure logic (Host half)
//
// This module has zero runtime dependencies so unit tests can import it
// directly under plain Node.js. Keep every function here free of side
// effects: they only map inputs to outputs (or throw), never touch
// services, HTTP, or module state.

export const MAX_BYTES = 5 * 1024 * 1024

export const MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif"
}

// Validate an image path by its extension and return the matching MIME type.
// Throws on missing or unsupported extensions; the messages match the UI copy.
export function parseImagePath(path) {
  const match = /\.([a-z0-9]+)$/i.exec(path)
  if (!match) throw new Error("无法识别文件类型,请使用 png/jpg/jpeg/webp/gif 图片")
  const ext = match[1].toLowerCase()
  const mime = MIME[ext]
  if (!mime) throw new Error("仅支持 png/jpg/jpeg/webp/gif 图片")
  return { ext, mime }
}

// Map an untrusted state object (from POST /dyn-bgimg/save) to the clean,
// persistable shape, applying defaults for missing or mistyped fields.
export function normalizeSaveState(state) {
  return {
    kind: typeof state.kind === "string" ? state.kind : "none",
    desc: typeof state.desc === "string" ? state.desc : "",
    strength: typeof state.strength === "number" ? state.strength : 55,
    size: String(state.size ?? "cover"),
    light: typeof state.light === "string" ? state.light : "",
    dark: typeof state.dark === "string" ? state.dark : "",
    ...(typeof state.imagePath === "string" && state.imagePath ? { imagePath: state.imagePath } : {})
  }
}

// Map a persisted state (from the settings service) to the response shape of
// GET /dyn-bgimg/state. Returns null when there is nothing to show, and only
// keeps imagePath when it is a non-empty string.
export function sanitizeSavedState(saved) {
  if (saved === null || saved === undefined || saved.kind === "none" || saved.kind === undefined) return null
  return {
    kind: saved.kind,
    desc: saved.desc ?? "",
    strength: typeof saved.strength === "number" ? saved.strength : 55,
    size: saved.size ?? "cover",
    light: saved.light ?? "",
    dark: saved.dark ?? "",
    ...(typeof saved.imagePath === "string" && saved.imagePath ? { imagePath: saved.imagePath } : {})
  }
}
