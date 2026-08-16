// Integration tests for the Host half (lib/index.js).
//
// apply() is booted with mocked `fs` / `webServer` / `settings` services (the
// real Cordis contract: ctx.get + ctx.effect), then the four registered HTTP
// routes are invoked with fake request/response objects.
import { test } from "node:test"
import assert from "node:assert/strict"

import { apply, ALLOWED_DIRS } from "../lib/index.js"

const FAKE_BYTES = Buffer.from("fake-image-bytes")

function fakeRes() {
  const res = { status: 0, headers: null, body: null }
  res.writeHead = (status, headers) => {
    res.status = status
    res.headers = headers
  }
  res.end = (body) => {
    res.body = body
  }
  return res
}

function jsonReq(payload) {
  const body = payload === undefined ? null : JSON.stringify(payload)
  return {
    method: "POST",
    async *[Symbol.asyncIterator]() {
      if (body !== null) yield Buffer.from(body, "utf8")
    }
  }
}

// Boot the Host plugin with optional fs/settings mocks; returns the routes
// that webServer.register received (inside ctx.effect, like the real kernel).
function bootHost({ fs = null, settings } = {}) {
  const routes = []
  const services = {
    fs: fs ?? {
      resolve: async (path) => path,
      readBytes: async () => FAKE_BYTES
    },
    webServer: {
      register(route) {
        routes.push(route)
      }
    }
  }
  if (settings !== undefined) services.settings = settings
  const ctx = {
    get(name) {
      return services[name]
    },
    effect(cb) {
      cb()
    }
  }
  apply(ctx)
  return { routes, services }
}

function findRoute(routes, path) {
  const route = routes.find((r) => r.path === path)
  assert.ok(route, "route registered: " + path)
  return route
}

// ── POST /dyn-bgimg/load (path validation + file reading) ────────────────────

test("load rejects unsupported extensions with the UI error message", async () => {
  const { routes } = bootHost()
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\pics\\bg.bmp" }), res)
  assert.equal(res.status, 500)
  assert.match(JSON.parse(res.body).error, /仅支持 png\/jpg\/jpeg\/webp\/gif/)
})

test("load rejects paths without an extension", async () => {
  const { routes } = bootHost()
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\pics\\background" }), res)
  assert.equal(res.status, 500)
  assert.match(JSON.parse(res.body).error, /无法识别文件类型/)
})

test("load rejects an empty path with a 400", async () => {
  const { routes } = bootHost()
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "   " }), res)
  assert.equal(res.status, 400)
  assert.match(JSON.parse(res.body).error, /请输入图片路径/)
})

test("load rejects non-POST requests", async () => {
  const { routes } = bootHost()
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler({ method: "GET" }, res)
  assert.equal(res.status, 405)
})

test("load reads a valid local image and returns a fresh URL", async () => {
  const { routes } = bootHost()
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\pics\\bg.webp" }), res)
  assert.equal(res.status, 200)
  const body = JSON.parse(res.body)
  assert.equal(body.ok, true)
  assert.equal(body.bytes, FAKE_BYTES.length)
  assert.match(body.url, /^\/dyn-bgimg\/background\?v=\d+$/)
})

test("load forwards fs read failures as 500", async () => {
  const { routes } = bootHost({
    fs: {
      resolve: async (path) => path,
      readBytes: async () => {
        throw new Error("ENOENT")
      }
    }
  })
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\pics\\bg.png" }), res)
  assert.equal(res.status, 500)
  assert.equal(JSON.parse(res.body).error, "ENOENT")
})

// ── GET /dyn-bgimg/background (in-memory image serving) ──────────────────────

test("background returns 404 before any image is loaded", () => {
  const { routes } = bootHost()
  const res = fakeRes()
  findRoute(routes, "/dyn-bgimg/background").handler({}, res)
  assert.equal(res.status, 404)
  assert.equal(JSON.parse(res.body).error, "no image loaded")
})

test("background serves the loaded image with its mime type and no-store", async () => {
  const { routes } = bootHost()
  const load = fakeRes()
  await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\pics\\bg.PNG" }), load)
  assert.equal(load.status, 200)

  const res = fakeRes()
  findRoute(routes, "/dyn-bgimg/background").handler({}, res)
  assert.equal(res.status, 200)
  assert.equal(res.headers["Content-Type"], "image/png")
  assert.equal(res.headers["Cache-Control"], "no-store")
  assert.equal(res.body, FAKE_BYTES)
})

// ── POST /dyn-bgimg/save + GET /dyn-bgimg/state (persistence) ────────────────

test("save normalizes the state, state restores it (in-memory fallback)", async () => {
  const { routes } = bootHost()
  const save = fakeRes()
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({
    state: { kind: "gradient", desc: "预设 · 海风蓝", strength: 60, size: "cover", light: "l", dark: "d" }
  }), save)
  assert.equal(save.status, 200)

  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/state").handler({}, res)
  assert.equal(res.status, 200)
  assert.deepEqual(JSON.parse(res.body), {
    ok: true,
    state: { kind: "gradient", desc: "预设 · 海风蓝", strength: 60, size: "cover", light: "l", dark: "d" }
  })
})

test("save applies defaults when the client sends a partial state", async () => {
  const { routes } = bootHost()
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({ state: { kind: "color", light: "#f00" } }), fakeRes())

  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/state").handler({}, res)
  assert.deepEqual(JSON.parse(res.body).state, {
    kind: "color", desc: "", strength: 55, size: "cover", light: "#f00", dark: ""
  })
})

test("saving kind 'none' clears the saved background", async () => {
  const { routes } = bootHost()
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({ state: { kind: "gradient", light: "l", dark: "d" } }), fakeRes())
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({ state: { kind: "none" } }), fakeRes())

  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/state").handler({}, res)
  assert.deepEqual(JSON.parse(res.body), { ok: true, state: null })
})

test("save rejects a missing state object", async () => {
  const { routes } = bootHost()
  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({}), res)
  assert.equal(res.status, 400)
  assert.match(JSON.parse(res.body).error, /state must be an object/)
})

test("save/state use the settings provider when one is mounted", async () => {
  let stored = null
  const settings = {
    register(namespace) {
      assert.equal(namespace, "dsh-background-image")
      return {
        replace: async (state) => {
          stored = state
        },
        get: async () => stored
      }
    }
  }
  const { routes } = bootHost({ settings })
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({
    state: { kind: "image", desc: "本地图片", strength: 70, size: "150", light: "l", dark: "d", imagePath: "C:\\pics\\bg.png" }
  }), fakeRes())
  assert.equal(stored.kind, "image")
  assert.equal(stored.size, "150")

  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/state").handler({}, res)
  const body = JSON.parse(res.body)
  assert.equal(body.state.kind, "image")
  assert.equal(body.state.imagePath, "C:\\pics\\bg.png")
  // local images are re-read from disk on restore
  assert.match(body.state.light, /^#8a8f98 url\("\/dyn-bgimg\/background\?v=\d+"\)$/)
})

test("state tolerates a missing local image and keeps the saved fallback", async () => {
  let stored = null
  const settings = {
    register() {
      return {
        replace: async (state) => {
          stored = state
        },
        get: async () => stored
      }
    }
  }
  const { routes } = bootHost({
    settings,
    fs: {
      resolve: async (path) => path,
      readBytes: async () => {
        throw new Error("ENOENT")
      }
    }
  })
  await findRoute(routes, "/dyn-bgimg/save").handler(jsonReq({
    state: { kind: "image", light: "#8a8f98 url(\"old-url\")", dark: "d", imagePath: "C:\\gone\\bg.png" }
  }), fakeRes())

  const res = fakeRes()
  await findRoute(routes, "/dyn-bgimg/state").handler({}, res)
  const body = JSON.parse(res.body)
  assert.equal(body.ok, true)
  assert.equal(body.state.light, '#8a8f98 url("old-url")')
})

// ── directory whitelist (ALLOWED_DIRS) ───────────────────────────────────────

test("directory whitelist is empty by default (original permissive behavior)", () => {
  assert.deepEqual(ALLOWED_DIRS, [])
})

test("directory whitelist allows paths inside and blocks paths outside", async () => {
  ALLOWED_DIRS.push("C:\\Users\\92991\\Pictures")
  try {
    const { routes } = bootHost()

    const inside = fakeRes()
    await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\Users\\92991\\Pictures\\bg.png" }), inside)
    assert.equal(inside.status, 200)

    const outside = fakeRes()
    await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\Users\\92991\\Desktop\\bg.png" }), outside)
    assert.equal(outside.status, 500)
    assert.match(JSON.parse(outside.body).error, /不在允许的目录/)
  } finally {
    ALLOWED_DIRS.length = 0
  }
})

test("directory whitelist defeats '..' traversal", async () => {
  ALLOWED_DIRS.push("C:\\Users\\92991\\Pictures")
  try {
    const { routes } = bootHost()
    const res = fakeRes()
    await findRoute(routes, "/dyn-bgimg/load").handler(jsonReq({ path: "C:\\Users\\92991\\Pictures\\..\\Desktop\\bg.png" }), res)
    assert.equal(res.status, 500)
    assert.match(JSON.parse(res.body).error, /不在允许的目录/)
  } finally {
    ALLOWED_DIRS.length = 0
  }
})
