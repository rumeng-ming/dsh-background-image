window.__ModuleLoader__.load({
	id: "dsh-background-image",
	factory: (require) => {
		try {
			var module = { exports: {} };
			var exports = module.exports;
			Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
			let React = require("react");

		// ── package state (cleared with the plugin fiber) ──────────────────────
		var tokenDisposer = null;
		var cssDisposer = null;
		var currentBg = null;

		// Set to a local image path (e.g. "C:\\Users\\you\\Desktop\\bg.jpg") to
		// auto-apply it when the page loads; leave empty to disable auto-loading.
		const DEFAULT_IMAGE = "";

		const PRESETS = [
			{ id: "aurora", name: "极光紫", light: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", dark: "linear-gradient(135deg, #3b4a8f 0%, #6d4a9e 100%)" },
			{ id: "ocean", name: "海风蓝", light: "linear-gradient(135deg, #5b9de6 0%, #63c2d1 100%)", dark: "linear-gradient(135deg, #2c5364 0%, #203a43 100%)" },
			{ id: "sunset", name: "落日橙", light: "linear-gradient(135deg, #f6a86b 0%, #f47d6c 100%)", dark: "linear-gradient(135deg, #8a4b3d 0%, #5a3a55 100%)" },
			{ id: "forest", name: "森林绿", light: "linear-gradient(135deg, #6fbf8e 0%, #4da37a 100%)", dark: "linear-gradient(135deg, #1f5c3d 0%, #16432e 100%)" },
			{ id: "ink", name: "墨色", light: "linear-gradient(135deg, #b9bec8 0%, #8f96a3 100%)", dark: "linear-gradient(135deg, #262a33 0%, #14161c 100%)" }
		];

		const SETTINGS_CSS = `
      .bgst-root { display: flex; flex-direction: column; gap: 4px; max-width: 520px; padding: 4px 0 12px; font-size: 13px; color: var(--dsw-alias-label-primary); }
      .bgst-title { margin: 0 0 4px; font-size: 16px; }
      .bgst-hint { margin: 0 0 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .bgst-label { margin-top: 10px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
      .bgst-range { flex: 1; accent-color: var(--dsw-alias-brand-primary); }
      .bgst-strength-val { min-width: 36px; text-align: right; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .bgst-swatches { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
      .bgst-swatch {
        width: 64px; height: 40px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        color: #fff;
        font-size: 11px;
        text-shadow: 0 1px 2px rgba(0,0,0,.55);
        cursor: pointer;
        transition: transform .12s ease, border-color .12s ease;
      }
      .bgst-swatch:hover { transform: translateY(-1px); border-color: var(--dsw-alias-brand-primary); }
      .bgst-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
      .bgst-input {
        flex: 1; height: 28px; padding: 0 8px;
        font-size: 12px;
        color: var(--dsw-alias-label-primary);
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 6px;
      }
      .bgst-input:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
      .bgst-color { width: 40px; height: 28px; padding: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: transparent; cursor: pointer; }
      .bgst-btn {
        height: 28px; padding: 0 12px;
        font-size: 12px;
        border-radius: 6px;
        border: 1px solid var(--dsw-alias-border-l2);
        background: transparent;
        color: var(--dsw-alias-label-primary);
        cursor: pointer;
        white-space: nowrap;
      }
      .bgst-btn:hover:not(:disabled) { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
      .bgst-btn:disabled { opacity: .45; cursor: default; }
      .bgst-btn-plain { border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .bgst-btn-active { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
      .bgst-error {
        margin-top: 10px; padding: 8px;
        font-size: 12px;
        color: var(--dsw-alias-state-error-primary);
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px;
      }
      .bgst-status { margin-top: 10px; font-size: 12px; color: var(--dsw-alias-state-success-primary); }
    `;

		function applyBg(kind, light, dark, desc, strength, size, theme) {
			if (tokenDisposer) { tokenDisposer(); tokenDisposer = null; }
			if (cssDisposer) { cssDisposer(); cssDisposer = null; }
			tokenDisposer = theme.overrideTokens("dsh-background-image", {
				"--dsw-alias-bg-base": { light: "transparent", dark: "transparent" }
			});
			const opacity = Math.max(0, Math.min(1, strength / 100));
			const sizeCss = size === "contain" ? "contain" : size === "cover" ? "cover" : String(size) + "%";
			const tag = document.createElement("style");
			tag.dataset.dyn = "dsh-background-image";
			tag.textContent =
				"body { background: #f4f5f8 !important; }\n" +
				"body[data-ds-dark-theme] { background: #101218 !important; }\n" +
				"html::before { content: \"\"; position: fixed; inset: 0; z-index: -1; pointer-events: none; background: " + light + "; background-size: " + sizeCss + "; background-position: center; background-repeat: no-repeat; opacity: " + opacity + "; }\n" +
				"html:has(body[data-ds-dark-theme])::before { background: " + dark + "; }";
			document.head.appendChild(tag);
			cssDisposer = () => tag.remove();
			currentBg = { kind, rawLight: light, rawDark: dark, desc, strength, size };
		}

		function clearBg() {
			if (tokenDisposer) { tokenDisposer(); tokenDisposer = null; }
			if (cssDisposer) { cssDisposer(); cssDisposer = null; }
			currentBg = null;
		}

		function sizeOf(state) {
			if (state.kind !== "image") return "cover";
			if (state.imgSize === "scale") return state.imgScale;
			return state.imgSize;
		}

		async function loadRemoteImage(path) {
			const res = await fetch("/dyn-bgimg/load", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path })
			});
			return res.json();
		}

		function BackgroundSettings(props, theme) {
			const [state, setState] = React.useState({
				kind: currentBg ? currentBg.kind : "none",
				desc: currentBg ? currentBg.desc : "",
				busy: false,
				error: "",
				urlText: "",
				localPath: "",
				colorValue: "#667eea",
				strength: currentBg ? currentBg.strength : 55,
				rawLight: currentBg ? currentBg.rawLight : "",
				rawDark: currentBg ? currentBg.rawDark : "",
				imgSize: currentBg && currentBg.size === "contain" ? "contain" : currentBg && currentBg.size === "cover" ? "cover" : "scale",
				imgScale: currentBg && currentBg.size !== "cover" && currentBg.size !== "contain" ? currentBg.size : 100
			});

			const applyFromState = (kind, light, dark, desc, nextState) => {
				const merged = { ...state, ...nextState };
				applyBg(kind, light, dark, desc, merged.strength, sizeOf(merged), theme);
				setState((s) => ({ ...s, ...nextState, kind, rawLight: light, rawDark: dark, desc, busy: false, error: "" }));
			};

			const reset = () => {
				clearBg();
				setState((s) => ({ ...s, kind: "none", desc: "", rawLight: "", rawDark: "", error: "" }));
			};

			const setStrength = (v) => {
				setState((s) => ({ ...s, strength: v }));
				if (state.kind !== "none" && state.rawLight) {
					applyBg(state.kind, state.rawLight, state.rawDark, state.desc, v, sizeOf(state), theme);
				}
			};

			const setImgSize = (mode) => {
				const next = { imgSize: mode };
				if (state.kind === "image" && state.rawLight) {
					applyFromState(state.kind, state.rawLight, state.rawDark, state.desc, next);
				} else {
					setState((s) => ({ ...s, ...next }));
				}
			};

			const setImgScale = (v) => {
				setState((s) => ({ ...s, imgScale: v }));
				if (state.kind === "image" && state.rawLight) {
					applyBg(state.kind, state.rawLight, state.rawDark, state.desc, state.strength, v, theme);
				}
			};

			const applyColor = () => applyFromState("color", state.colorValue, state.colorValue, "纯色 " + state.colorValue, {});

			const applyUrl = () => {
				const u = state.urlText.trim();
				if (!u) { setState((s) => ({ ...s, error: "请输入图片地址" })); return; }
				const value = "#8a8f98 url(\"" + u + "\")";
				applyFromState("image", value, value, "网络图片 " + u, {});
			};

			const loadLocal = () => {
				const p = state.localPath.trim();
				if (!p) { setState((s) => ({ ...s, error: "请输入本地图片路径" })); return; }
				setState((s) => ({ ...s, busy: true, error: "" }));
				loadRemoteImage(p).then(
					(res) => {
						if (res && res.ok) {
							const value = "#8a8f98 url(\"" + res.url + "\")";
							applyFromState("image", value, value, "本地图片 " + p + "(" + String(res.bytes || 0) + " 字节)", {});
						} else {
							setState((s) => ({ ...s, busy: false, error: (res && res.error) || "加载失败" }));
						}
					},
					(err) => {
						setState((s) => ({ ...s, busy: false, error: String((err && err.message) || err) }));
					}
				);
			};

			const setUrl = (e) => setState((s) => ({ ...s, urlText: e.target.value }));
			const setPath = (e) => setState((s) => ({ ...s, localPath: e.target.value }));
			const setColor = (e) => setState((s) => ({ ...s, colorValue: e.target.value }));
			const setStrengthInput = (e) => setStrength(Number(e.target.value));

			return React.createElement("div", { className: "bgst-root" },
				React.createElement("h3", { className: "bgst-title" }, "界面背景"),
				React.createElement("p", { className: "bgst-hint" }, "提示:强度越低背景越淡、文字越清晰;使用本地图片路径最稳定(最大 5MB)。"),

				React.createElement("div", { className: "bgst-label" }, "背景强度(越低背景越淡、文字越清晰)"),
				React.createElement("div", { className: "bgst-row" },
					React.createElement("input", { type: "range", min: "0", max: "100", step: "5", className: "bgst-range", value: state.strength, onChange: setStrengthInput }),
					React.createElement("span", { className: "bgst-strength-val" }, state.strength + "%")),

				React.createElement("div", { className: "bgst-label" }, "预设渐变"),
				React.createElement("div", { className: "bgst-swatches" },
					PRESETS.map((p) => React.createElement("button", {
						type: "button", key: p.id, className: "bgst-swatch", title: p.name,
						style: { background: p.light },
						onClick: () => applyFromState("gradient", p.light, p.dark, "预设 · " + p.name, {})
					}, p.name))),

				React.createElement("div", { className: "bgst-label" }, "纯色"),
				React.createElement("div", { className: "bgst-row" },
					React.createElement("input", { type: "color", className: "bgst-color", value: state.colorValue, onChange: setColor }),
					React.createElement("button", { type: "button", className: "bgst-btn", onClick: applyColor }, "应用颜色")),

				React.createElement("div", { className: "bgst-label" }, "网络图片地址"),
				React.createElement("div", { className: "bgst-row" },
					React.createElement("input", { type: "text", className: "bgst-input", placeholder: "https://example.com/bg.jpg", value: state.urlText, onChange: setUrl }),
					React.createElement("button", { type: "button", className: "bgst-btn", onClick: applyUrl }, "应用")),

				React.createElement("div", { className: "bgst-label" }, "本地图片路径"),
				React.createElement("div", { className: "bgst-row" },
					React.createElement("input", { type: "text", className: "bgst-input", placeholder: "C:\\pics\\bg.png(最大 5MB)", value: state.localPath, onChange: setPath }),
					React.createElement("button", { type: "button", className: "bgst-btn", disabled: state.busy, onClick: loadLocal }, state.busy ? "加载中…" : "加载并应用")),

				state.kind === "image"
					? React.createElement("div", null,
							React.createElement("div", { className: "bgst-label" }, "图片大小"),
							React.createElement("div", { className: "bgst-row" },
								React.createElement("button", { type: "button", className: "bgst-btn" + (state.imgSize === "cover" ? " bgst-btn-active" : ""), onClick: () => setImgSize("cover") }, "适应窗口"),
								React.createElement("button", { type: "button", className: "bgst-btn" + (state.imgSize === "contain" ? " bgst-btn-active" : ""), onClick: () => setImgSize("contain") }, "完整显示"),
								React.createElement("button", { type: "button", className: "bgst-btn" + (state.imgSize === "scale" ? " bgst-btn-active" : ""), onClick: () => setImgSize("scale") }, "自定义")),
							state.imgSize === "scale"
								? React.createElement("div", { className: "bgst-row" },
										React.createElement("input", { type: "range", min: "30", max: "200", step: "5", className: "bgst-range", value: state.imgScale, onChange: (e) => setImgScale(Number(e.target.value)) }),
										React.createElement("span", { className: "bgst-strength-val" }, state.imgScale + "%"))
								: null)
					: null,

				state.error ? React.createElement("div", { className: "bgst-error" }, state.error) : null,
				state.desc ? React.createElement("div", { className: "bgst-status" }, "当前背景:" + state.desc + "(不透明度 " + state.strength + "%)") : null,
				React.createElement("div", { className: "bgst-row" },
					React.createElement("button", { type: "button", className: "bgst-btn bgst-btn-plain", disabled: state.kind === "none", onClick: reset }, "重置为默认"))
			);
		}

		const inject = [];

		function apply(ctx) {
			const theme = ctx.get("theme");
			const slots = ctx.get("slots");
			if (theme === undefined || slots === undefined) return;

			ctx.effect(() => () => clearBg());

			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.dyn = "dsh-background-image";
				tag.textContent = SETTINGS_CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			});

			slots.inject("settings.section", () => slots.register(
				{ name: "settings.section", id: "background", order: 30, label: "背景图" },
				(props) => React.createElement(BackgroundSettings, { ...props, theme })
			));

			if (DEFAULT_IMAGE) {
				loadRemoteImage(DEFAULT_IMAGE).then(
					(res) => {
						if (res && res.ok) {
							const value = "#8a8f98 url(\"" + res.url + "\")";
							applyBg("image", value, value, "自动加载:" + DEFAULT_IMAGE, 55, "contain", theme);
						}
					},
					() => { /* auto-load is best-effort */ }
				);
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
		} catch (error) {
			// A failure here must never block the UI: degrade to a no-op module
			// and leave a trace for diagnostics.
			console.error("[dsh-background-image] client module failed to load:", error);
			exports.apply = () => {};
			exports.inject = [];
			return module.exports;
		}
	}
});
