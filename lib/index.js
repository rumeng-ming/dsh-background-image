// dsh-background-image — Host half (static Cordis plugin)
//
// Responsibilities:
//  1. Serve the in-memory image at GET /dyn-bgimg/background
//     (the browser loads it as a normal same-origin URL).
//  2. Accept POST /dyn-bgimg/load { path } — read a local image file
//     (png/jpg/jpeg/webp/gif, ≤ 5 MB) into memory and return its URL.
//  3. Persist the last applied background through the `settings` service
//     (POST /dyn-bgimg/save, GET /dyn-bgimg/state) so it is restored after a
//     restart; falls back to in-memory storage when no settings provider is
//     mounted.
//
// Lifecycle: routes are registered through ctx.effect, so they are removed
// automatically when this plugin row is disabled or removed.
//
// `inject` declares the two Host services as hard dependencies: Cordis parks
// this plugin until both are provided, then activates it (the shipped web
// profile provides `fs` via dsh-fs-local and `webServer` via dsh-host-webserver).

import z from "@deepseek-ai/schemastery"

const SETTINGS_NAMESPACE = "dsh-background-image"

const STATE_SCHEMA = z.object({
  kind: z.string().required(),
  desc: z.string(),
  strength: z.number(),
  size: z.string(),
  light: z.string(),
  dark: z.string(),
  imagePath: z.string()
})

const inject = ["fs", "webServer"]

function apply(ctx) {
  const fs = ctx.get("fs")
  const webServer = ctx.get("webServer")
  if (fs === undefined || webServer === undefined) return
  const MIME = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif"
  }
  const MAX_BYTES = 5 * 1024 * 1024

  let currentImage = null

  // Persistence: settings scope when the provider is mounted, memory fallback.
  const settings = ctx.get("settings")
  let scope = null
  let memoryState = null
  if (settings !== undefined) {
    scope = settings.register(SETTINGS_NAMESPACE, STATE_SCHEMA, {})
  }

  async function saveState(state) {
    if (scope !== null) return scope.replace(state)
    memoryState = state
  }

  async function readState() {
    if (scope !== null) return scope.get() ?? null
    return memoryState
  }

  async function readBody(req, maxBytes = 64 * 1024) {
    let size = 0
    const chunks = []
    for await (const chunk of req) {
      size += chunk.length
      if (size > maxBytes) throw new Error("request body too large")
      chunks.push(chunk)
    }
    return Buffer.concat(chunks).toString("utf8")
  }

  function respond(res, status, payload) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify(payload))
  }

  async function loadImage(path) {
    const match = /\.([a-z0-9]+)$/i.exec(path)
    if (!match) throw new Error("无法识别文件类型,请使用 png/jpg/jpeg/webp/gif 图片")
    const mime = MIME[match[1].toLowerCase()]
    if (!mime) throw new Error("仅支持 png/jpg/jpeg/webp/gif 图片")
    const target = await fs.resolve(path)
    const bytes = await fs.readBytes(target, undefined, MAX_BYTES)
    currentImage = { bytes, mime }
    return { ok: true, url: "/dyn-bgimg/background?v=" + Date.now(), bytes: bytes.length }
  }

  ctx.effect(() => webServer.register({
    kind: "exact",
    path: "/dyn-bgimg/background",
    handler(_req, res) {
      if (currentImage === null) {
        respond(res, 404, { ok: false, error: "no image loaded" })
        return
      }
      res.writeHead(200, {
        "Content-Type": currentImage.mime,
        "Cache-Control": "no-store"
      })
      res.end(currentImage.bytes)
    }
  }))

  ctx.effect(() => webServer.register({
    kind: "exact",
    path: "/dyn-bgimg/load",
    handler: async (req, res) => {
      if (req.method !== "POST") {
        respond(res, 405, { ok: false, error: "POST only" })
        return
      }
      let body
      try {
        body = JSON.parse(await readBody(req))
      } catch {
        respond(res, 400, { ok: false, error: "invalid JSON body" })
        return
      }
      const path = body && typeof body.path === "string" ? body.path.trim() : ""
      if (!path) {
        respond(res, 400, { ok: false, error: "请输入图片路径" })
        return
      }
      try {
        respond(res, 200, await loadImage(path))
      } catch (err) {
        respond(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  ctx.effect(() => webServer.register({
    kind: "exact",
    path: "/dyn-bgimg/save",
    handler: async (req, res) => {
      if (req.method !== "POST") {
        respond(res, 405, { ok: false, error: "POST only" })
        return
      }
      let body
      try {
        body = JSON.parse(await readBody(req))
      } catch {
        respond(res, 400, { ok: false, error: "invalid JSON body" })
        return
      }
      const state = body && typeof body.state === "object" && body.state !== null ? body.state : null
      if (state === null) {
        respond(res, 400, { ok: false, error: "state must be an object" })
        return
      }
      try {
        await saveState({
          kind: typeof state.kind === "string" ? state.kind : "none",
          desc: typeof state.desc === "string" ? state.desc : "",
          strength: typeof state.strength === "number" ? state.strength : 55,
          size: String(state.size ?? "cover"),
          light: typeof state.light === "string" ? state.light : "",
          dark: typeof state.dark === "string" ? state.dark : "",
          ...(typeof state.imagePath === "string" && state.imagePath ? { imagePath: state.imagePath } : {})
        })
        respond(res, 200, { ok: true })
      } catch (err) {
        respond(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  ctx.effect(() => webServer.register({
    kind: "exact",
    path: "/dyn-bgimg/state",
    handler: async (_req, res) => {
      try {
        const saved = await readState()
        if (saved === null || saved === undefined || saved.kind === "none" || saved.kind === undefined) {
          respond(res, 200, { ok: true, state: null })
          return
        }
        const state = {
          kind: saved.kind,
          desc: saved.desc ?? "",
          strength: typeof saved.strength === "number" ? saved.strength : 55,
          size: saved.size ?? "cover",
          light: saved.light ?? "",
          dark: saved.dark ?? "",
          ...(typeof saved.imagePath === "string" && saved.imagePath ? { imagePath: saved.imagePath } : {})
        }
        // Local images: re-read the file (the saved URL is only valid per boot).
        if (state.kind === "image" && state.imagePath) {
          try {
            const result = await loadImage(state.imagePath)
            const value = "#8a8f98 url(\"" + result.url + "\")"
            state.light = value
            state.dark = value
          } catch (err) {
            /* image missing/unreadable — keep the saved fallback values */
          }
        }
        respond(res, 200, { ok: true, state })
      } catch (err) {
        respond(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))
}

export { apply, inject }
