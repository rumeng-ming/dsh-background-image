// Background Image — Client half
// 注册 设置 → 背景图 页面:预设渐变 / 纯色 / 网络图片 / 本地图片。
// 背景渲染在 html::before 根层(z-index: -1,确定性位于所有内容之下),
// 弱化靠 opacity(背景强度滑块)。
// 图片大小:适应窗口(cover)/ 完整显示(contain)/ 自定义缩放 30~200%。
// 插件激活时自动加载示例图片(带重试)。
let themeService = null
let tokenDisposer = null
let cssDisposer = null
let currentBg = null

// 设为本地图片路径(如 'C:\\Users\\you\\Desktop\\bg.jpg')则插件激活时自动设为背景;
// 设为空字符串则关闭自动加载。
const DEFAULT_IMAGE = ''

const PRESETS = [
  { id: 'aurora', name: '极光紫', light: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', dark: 'linear-gradient(135deg, #3b4a8f 0%, #6d4a9e 100%)' },
  { id: 'ocean', name: '海风蓝', light: 'linear-gradient(135deg, #5b9de6 0%, #63c2d1 100%)', dark: 'linear-gradient(135deg, #2c5364 0%, #203a43 100%)' },
  { id: 'sunset', name: '落日橙', light: 'linear-gradient(135deg, #f6a86b 0%, #f47d6c 100%)', dark: 'linear-gradient(135deg, #8a4b3d 0%, #5a3a55 100%)' },
  { id: 'forest', name: '森林绿', light: 'linear-gradient(135deg, #6fbf8e 0%, #4da37a 100%)', dark: 'linear-gradient(135deg, #1f5c3d 0%, #16432e 100%)' },
  { id: 'ink', name: '墨色', light: 'linear-gradient(135deg, #b9bec8 0%, #8f96a3 100%)', dark: 'linear-gradient(135deg, #262a33 0%, #14161c 100%)' }
]

function applyBg(kind, light, dark, desc, strength, size) {
  if (!themeService) return
  if (tokenDisposer) { tokenDisposer(); tokenDisposer = null }
  if (cssDisposer) { cssDisposer(); cssDisposer = null }
  tokenDisposer = themeService.overrideTokens('dyn-bgimg', {
    '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' }
  })
  const opacity = Math.max(0, Math.min(1, strength / 100))
  const sizeCss = size === 'contain' ? 'contain' : size === 'cover' ? 'cover' : String(size) + '%'
  cssDisposer = styles.insert(
    'body { background: #f4f5f8 !important; }\n' +
    'body[data-ds-dark-theme] { background: #101218 !important; }\n' +
    'html::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none; background: ' + light + '; background-size: ' + sizeCss + '; background-position: center; background-repeat: no-repeat; opacity: ' + opacity + '; }\n' +
    'html:has(body[data-ds-dark-theme])::before { background: ' + dark + '; }'
  )
  currentBg = { kind, rawLight: light, rawDark: dark, desc, strength, size }
}

function clearBg() {
  if (tokenDisposer) { tokenDisposer(); tokenDisposer = null }
  if (cssDisposer) { cssDisposer(); cssDisposer = null }
  currentBg = null
}

function sizeOf(state) {
  if (state.kind !== 'image') return 'cover'
  if (state.imgSize === 'scale') return state.imgScale
  return state.imgSize
}

function BackgroundSettings(props) {
  const [state, setState] = React.useState({
    kind: currentBg ? currentBg.kind : 'none',
    desc: currentBg ? currentBg.desc : '',
    busy: false,
    error: '',
    urlText: '',
    localPath: '',
    colorValue: '#667eea',
    strength: currentBg ? currentBg.strength : 55,
    rawLight: currentBg ? currentBg.rawLight : '',
    rawDark: currentBg ? currentBg.rawDark : '',
    imgSize: currentBg && currentBg.size === 'contain' ? 'contain' : currentBg && currentBg.size === 'cover' ? 'cover' : 'scale',
    imgScale: currentBg && currentBg.size !== 'cover' && currentBg.size !== 'contain' ? currentBg.size : 100
  })

  const applyFromState = (kind, light, dark, desc, nextState) => {
    const merged = { ...state, ...nextState }
    const size = sizeOf(merged)
    applyBg(kind, light, dark, desc, merged.strength, size)
    setState((s) => ({ ...s, ...nextState, kind, rawLight: light, rawDark: dark, desc, busy: false, error: '' }))
  }

  const reset = () => {
    clearBg()
    setState((s) => ({ ...s, kind: 'none', desc: '', rawLight: '', rawDark: '', error: '' }))
  }

  const setStrength = (v) => {
    setState((s) => ({ ...s, strength: v }))
    if (state.kind !== 'none' && state.rawLight) {
      applyBg(state.kind, state.rawLight, state.rawDark, state.desc, v, sizeOf(state))
    }
  }

  const setImgSize = (mode) => {
    const next = { imgSize: mode }
    if (state.kind === 'image' && state.rawLight) {
      applyFromState(state.kind, state.rawLight, state.rawDark, state.desc, next)
    } else {
      setState((s) => ({ ...s, ...next }))
    }
  }

  const setImgScale = (v) => {
    setState((s) => ({ ...s, imgScale: v }))
    if (state.kind === 'image' && state.rawLight) {
      applyBg(state.kind, state.rawLight, state.rawDark, state.desc, state.strength, v)
    }
  }

  const applyColor = () => applyFromState('color', state.colorValue, state.colorValue, '纯色 ' + state.colorValue, {})

  const applyUrl = () => {
    const u = state.urlText.trim()
    if (!u) { setState((s) => ({ ...s, error: '请输入图片地址' })); return }
    const value = '#8a8f98 url("' + u + '")'
    applyFromState('image', value, value, '网络图片 ' + u, {})
  }

  const loadLocal = () => {
    const p = state.localPath.trim()
    if (!p) { setState((s) => ({ ...s, error: '请输入本地图片路径' })); return }
    setState((s) => ({ ...s, busy: true, error: '' }))
    host.call('read_image', { path: p }).then(
      (res) => {
        if (res && res.ok) {
          const value = '#8a8f98 url("' + res.url + '")'
          applyFromState('image', value, value, '本地图片 ' + p + '(' + String(res.bytes || 0) + ' 字节)', {})
        } else {
          setState((s) => ({ ...s, busy: false, error: (res && res.error) || '加载失败' }))
        }
      },
      (err) => {
        setState((s) => ({ ...s, busy: false, error: String((err && err.message) || err) }))
      }
    )
  }

  const setUrl = (e) => setState((s) => ({ ...s, urlText: e.target.value }))
  const setPath = (e) => setState((s) => ({ ...s, localPath: e.target.value }))
  const setColor = (e) => setState((s) => ({ ...s, colorValue: e.target.value }))
  const setStrengthInput = (e) => setStrength(Number(e.target.value))

  return React.createElement('div', { className: 'bgst-root' },
    React.createElement('h3', { className: 'bgst-title' }, '界面背景'),
    React.createElement('p', { className: 'bgst-hint' }, '提示:插件激活时会自动加载桌面示例图片;强度越低背景越淡、文字越清晰;插件重载后需重新应用。'),

    React.createElement('div', { className: 'bgst-label' }, '背景强度(越低背景越淡、文字越清晰)'),
    React.createElement('div', { className: 'bgst-row' },
      React.createElement('input', { type: 'range', min: '0', max: '100', step: '5', className: 'bgst-range', value: state.strength, onChange: setStrengthInput }),
      React.createElement('span', { className: 'bgst-strength-val' }, state.strength + '%')),

    React.createElement('div', { className: 'bgst-label' }, '预设渐变'),
    React.createElement('div', { className: 'bgst-swatches' },
      PRESETS.map((p) => React.createElement('button', {
        type: 'button', key: p.id, className: 'bgst-swatch', title: p.name,
        style: { background: p.light },
        onClick: () => applyFromState('gradient', p.light, p.dark, '预设 · ' + p.name, {})
      }, p.name))),

    React.createElement('div', { className: 'bgst-label' }, '纯色'),
    React.createElement('div', { className: 'bgst-row' },
      React.createElement('input', { type: 'color', className: 'bgst-color', value: state.colorValue, onChange: setColor }),
      React.createElement('button', { type: 'button', className: 'bgst-btn', onClick: applyColor }, '应用颜色')),

    React.createElement('div', { className: 'bgst-label' }, '网络图片地址'),
    React.createElement('div', { className: 'bgst-row' },
      React.createElement('input', { type: 'text', className: 'bgst-input', placeholder: 'https://example.com/bg.jpg', value: state.urlText, onChange: setUrl }),
      React.createElement('button', { type: 'button', className: 'bgst-btn', onClick: applyUrl }, '应用')),

    React.createElement('div', { className: 'bgst-label' }, '本地图片路径'),
    React.createElement('div', { className: 'bgst-row' },
      React.createElement('input', { type: 'text', className: 'bgst-input', placeholder: 'C:\\pics\\bg.png(最大 5MB)', value: state.localPath, onChange: setPath }),
      React.createElement('button', { type: 'button', className: 'bgst-btn', disabled: state.busy, onClick: loadLocal }, state.busy ? '加载中…' : '加载并应用')),

    state.kind === 'image'
      ? React.createElement('div', null,
          React.createElement('div', { className: 'bgst-label' }, '图片大小'),
          React.createElement('div', { className: 'bgst-row' },
            React.createElement('button', { type: 'button', className: 'bgst-btn' + (state.imgSize === 'cover' ? ' bgst-btn-active' : ''), onClick: () => setImgSize('cover') }, '适应窗口'),
            React.createElement('button', { type: 'button', className: 'bgst-btn' + (state.imgSize === 'contain' ? ' bgst-btn-active' : ''), onClick: () => setImgSize('contain') }, '完整显示'),
            React.createElement('button', { type: 'button', className: 'bgst-btn' + (state.imgSize === 'scale' ? ' bgst-btn-active' : ''), onClick: () => setImgSize('scale') }, '自定义')),
          state.imgSize === 'scale'
            ? React.createElement('div', { className: 'bgst-row' },
                React.createElement('input', { type: 'range', min: '30', max: '200', step: '5', className: 'bgst-range', value: state.imgScale, onChange: (e) => setImgScale(Number(e.target.value)) }),
                React.createElement('span', { className: 'bgst-strength-val' }, state.imgScale + '%'))
            : null)
      : null,

    state.error ? React.createElement('div', { className: 'bgst-error' }, state.error) : null,
    state.desc ? React.createElement('div', { className: 'bgst-status' }, '当前背景:' + state.desc + '(不透明度 ' + state.strength + '%)') : null,
    React.createElement('div', { className: 'bgst-row' },
      React.createElement('button', { type: 'button', className: 'bgst-btn bgst-btn-plain', disabled: state.kind === 'none', onClick: reset }, '重置为默认'))
  )
}

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    const theme = ctx.get('theme')
    const timer = ctx.get('timer')
    if (theme !== undefined) themeService = theme

    let cancelled = false
    ctx.effect(() => () => { cancelled = true })
    ctx.effect(() => () => clearBg())

    const tryLoad = (attempt) => {
      if (cancelled) return
      if (!DEFAULT_IMAGE) return
      host.call('read_image', { path: DEFAULT_IMAGE }).then(
        (res) => {
          if (cancelled) return
          if (res && res.ok) {
            const value = '#8a8f98 url("' + res.url + '")'
            applyBg('image', value, value, '自动加载:桌面示例图片(' + String(res.bytes || 0) + ' 字节)', 55, 'contain')
          } else {
            console.log('bgimg: auto apply failed:', res && res.error)
          }
        },
        (err) => {
          if (cancelled) return
          const message = String((err && err.message) || err)
          if (attempt < 6 && message.indexOf('not registered') >= 0 && timer !== undefined) {
            timer.timeout(() => tryLoad(attempt + 1), 1000)
          } else {
            console.log('bgimg: auto apply error:', message)
          }
        }
      )
    }
    tryLoad(1)

    styles.insert(`
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
    `)

    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'background', order: 30, label: '背景图' },
      (props) => React.createElement(BackgroundSettings, props)
    ))
  }
}
