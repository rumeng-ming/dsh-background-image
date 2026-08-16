// Tests for the browser half (lib/client.js).
//
// The client bundle is a window.__ModuleLoader__.load() factory that only runs
// inside the DSH Web GUI, so these tests load the REAL source file in a vm
// sandbox with a minimal fake DOM / fetch / theme and drive it from the
// outside — nothing here tests a copy of the logic.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const source = readFileSync(fileURLToPath(new URL("../lib/client.js", import.meta.url)), "utf8")

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

const SAVED_GRADIENT = {
  kind: "gradient",
  desc: "预设 · 极光紫",
  strength: 55,
  size: "cover",
  light: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  dark: "linear-gradient(135deg, #3b4a8f 0%, #6d4a9e 100%)"
}

// Load the real client.js inside a fake browser environment.
function loadClient(stateResponse) {
  const head = []
  const fetchCalls = []
  let factory = null

  const sandbox = {
    console,
    window: {
      __ModuleLoader__: {
        load(spec) {
          factory = spec.factory
        }
      }
    },
    document: {
      head: {
        appendChild(node) {
          head.push(node)
        }
      },
      createElement() {
        return {
          dataset: {},
          textContent: "",
          remove() {
            const i = head.indexOf(this)
            if (i >= 0) head.splice(i, 1)
          }
        }
      }
    },
    fetch(url, init) {
      const call = { url, init }
      fetchCalls.push(call)
      if (url === "/dyn-bgimg/state") {
        return Promise.resolve({ json: () => Promise.resolve(stateResponse ?? { ok: true, state: null }) })
      }
      return Promise.resolve({})
    }
  }
  vm.runInNewContext(source, sandbox, { filename: "lib/client.js" })

  const React = { createElement: () => null, useState: (init) => [init, () => {}] }
  const module = factory((name) => {
    if (name === "react") return React
    throw new Error("unexpected require: " + name)
  })
  return { module, head, fetchCalls }
}

// Boot the plugin: run apply() with mocked cordis services, collect disposers.
function boot(module) {
  const disposers = []
  const tokenCalls = []
  const tokenDisposers = []
  const ctx = {
    get(name) {
      if (name === "theme") {
        return {
          overrideTokens(ns, tokens) {
            tokenCalls.push({ ns, tokens })
            const disposer = () => {
              tokenDisposers.push("called")
            }
            return disposer
          }
        }
      }
      if (name === "slots") {
        return { inject: () => {} }
      }
      return undefined
    },
    effect(cb) {
      disposers.push(cb())
    }
  }
  module.apply(ctx)
  return { disposers, tokenCalls, tokenDisposers }
}

function backgroundTag(head) {
  return head.find((node) => node.dataset.dyn === "dsh-background-image" && node.textContent.includes("html::before"))
}

// ── pure helpers (exported through the non-enumerable __test hook) ──────────

test("__test hook exposes the pure helpers without breaking the plugin contract", () => {
  const { module } = loadClient()
  assert.equal(module.inject.length, 2)
  assert.equal(typeof module.apply, "function")
  assert.equal(typeof module.__test.sizeOf, "function")
  assert.equal(typeof module.__test.clampOpacity, "function")
  assert.equal(typeof module.__test.resolveSizeCss, "function")
  assert.equal(typeof module.__test.buildBackgroundCss, "function")
})

test("sizeOf: non-image backgrounds fall back to cover", () => {
  const { module } = loadClient()
  assert.equal(module.__test.sizeOf({ kind: "gradient" }), "cover")
  assert.equal(module.__test.sizeOf({ kind: "color" }), "cover")
  assert.equal(module.__test.sizeOf({ kind: "none" }), "cover")
})

test("sizeOf: cover / contain pass through, scale returns the custom value", () => {
  const { module } = loadClient()
  assert.equal(module.__test.sizeOf({ kind: "image", imgSize: "cover" }), "cover")
  assert.equal(module.__test.sizeOf({ kind: "image", imgSize: "contain" }), "contain")
  assert.equal(module.__test.sizeOf({ kind: "image", imgSize: "scale", imgScale: 150 }), 150)
})

test("clampOpacity clamps strength into [0, 1]", () => {
  const { module } = loadClient()
  assert.equal(module.__test.clampOpacity(55), 0.55)
  assert.equal(module.__test.clampOpacity(0), 0)
  assert.equal(module.__test.clampOpacity(100), 1)
  assert.equal(module.__test.clampOpacity(200), 1)
  assert.equal(module.__test.clampOpacity(-10), 0)
})

test("resolveSizeCss maps the three size modes", () => {
  const { module } = loadClient()
  assert.equal(module.__test.resolveSizeCss("cover"), "cover")
  assert.equal(module.__test.resolveSizeCss("contain"), "contain")
  assert.equal(module.__test.resolveSizeCss("150"), "150%")
  assert.equal(module.__test.resolveSizeCss(30), "30%")
})

test("buildBackgroundCss composes all four layers", () => {
  const { module } = loadClient()
  const css = module.__test.buildBackgroundCss("light-bg", "dark-bg", "contain", 0.55)
  assert.match(css, /body \{ background: #f4f5f8 !important; \}/)
  assert.match(css, /body\[data-ds-dark-theme\] \{ background: #101218 !important; \}/)
  assert.match(css, /background: light-bg;/)
  assert.match(css, /background-size: contain;/)
  assert.match(css, /opacity: 0\.55;/)
  assert.match(css, /html:has\(body\[data-ds-dark-theme\]\)::before \{ background: dark-bg; \}/)
})

// ── restore flow (apply → GET /dyn-bgimg/state → applyBg) ────────────────────

test("restore applies a saved gradient and re-persists it", async () => {
  const { module, head, fetchCalls } = loadClient({ ok: true, state: SAVED_GRADIENT })
  boot(module)
  await tick()

  const tag = backgroundTag(head)
  assert.ok(tag, "background style tag appended")
  assert.match(tag.textContent, /linear-gradient\(135deg, #667eea 0%, #764ba2 100%\)/)
  assert.match(tag.textContent, /opacity: 0\.55/)
  assert.match(tag.textContent, /background-size: cover/)

  const save = fetchCalls.find((call) => call.url === "/dyn-bgimg/save")
  assert.ok(save, "restore re-persists the applied state")
  assert.deepEqual(JSON.parse(save.init.body), { state: SAVED_GRADIENT })
})

test("restore makes the app frame transparent through overrideTokens", async () => {
  const { module } = loadClient({ ok: true, state: SAVED_GRADIENT })
  const { tokenCalls } = boot(module)
  await tick()

  assert.equal(tokenCalls.length, 1)
  // JSON round-trip: the token object was created inside the vm realm, so
  // compare it as host-realm plain data.
  assert.deepEqual(JSON.parse(JSON.stringify(tokenCalls[0])), {
    ns: "dsh-background-image",
    tokens: { "--dsw-alias-bg-base": { light: "transparent", dark: "transparent" } }
  })
})

test("restore clamps extreme strengths through the full flow", async () => {
  for (const [strength, expected] of [[200, /opacity: 1;/], [-5, /opacity: 0;/], [0, /opacity: 0;/], [100, /opacity: 1;/]]) {
    const { module, head } = loadClient({ ok: true, state: { ...SAVED_GRADIENT, strength } })
    boot(module)
    await tick()
    assert.match(backgroundTag(head).textContent, expected, "strength " + strength)
  }
})

test("restore maps image size modes into background-size", async () => {
  for (const [size, expected] of [["contain", /background-size: contain;/], ["150", /background-size: 150%;/], ["cover", /background-size: cover;/]]) {
    const { module, head } = loadClient({ ok: true, state: { ...SAVED_GRADIENT, kind: "image", size } })
    boot(module)
    await tick()
    assert.match(backgroundTag(head).textContent, expected, "size " + size)
  }
})

test("no saved state leaves the page untouched and saves nothing", async () => {
  const { module, head, fetchCalls } = loadClient({ ok: true, state: null })
  const { tokenCalls } = boot(module)
  await tick()

  assert.equal(backgroundTag(head), undefined)
  assert.equal(tokenCalls.length, 0)
  assert.equal(fetchCalls.find((call) => call.url === "/dyn-bgimg/save"), undefined)
})

test("a saved 'none' kind is treated as no background", async () => {
  const { module, head } = loadClient({ ok: true, state: { kind: "none" } })
  boot(module)
  await tick()
  assert.equal(backgroundTag(head), undefined)
})

// ── lifecycle ────────────────────────────────────────────────────────────────

test("plugin dispose removes the injected CSS and restores the theme tokens", async () => {
  const { module, head } = loadClient({ ok: true, state: SAVED_GRADIENT })
  const { disposers, tokenDisposers } = boot(module)
  await tick()

  const tag = backgroundTag(head)
  assert.ok(tag)
  assert.equal(tokenDisposers.length, 0, "token disposer not called yet")

  for (const dispose of disposers) dispose()

  assert.equal(head.includes(tag), false, "background tag removed")
  assert.equal(head.length, 0, "settings CSS tag removed too")
  assert.equal(tokenDisposers.length, 1, "token disposer called on dispose")
})
