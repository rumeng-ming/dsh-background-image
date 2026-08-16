// dsh-background-image — Host half (static Cordis plugin)
//
// Responsibilities:
//  1. Serve the in-memory image at GET /dyn-bgimg/background
//     (the browser loads it as a normal same-origin URL).
//  2. Accept POST /dyn-bgimg/load { path } — read a local image file
//     (png/jpg/jpeg/webp/gif, ≤ 5 MB) into memory and return its URL.
//
// Lifecycle: both routes are registered through ctx.effect, so they are
// removed automatically when this plugin row is disabled or removed.
//
// No inject declaration: services are read with ctx.get() and each route
// registers only when its service exists, so this row can never park the
// composition on a missing dependency.

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
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
        res.end("no image loaded")
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
      const respond = (status, payload) => {
        res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify(payload))
      }
      if (req.method !== "POST") {
        respond(405, { ok: false, error: "POST only" })
        return
      }
      let body
      try {
        body = JSON.parse(await readBody(req))
      } catch {
        respond(400, { ok: false, error: "invalid JSON body" })
        return
      }
      const path = body && typeof body.path === "string" ? body.path.trim() : ""
      if (!path) {
        respond(400, { ok: false, error: "请输入图片路径" })
        return
      }
      try {
        respond(200, await loadImage(path))
      } catch (err) {
        respond(500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))
}

export { apply }
