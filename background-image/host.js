// Background Image — Host half
// 1. 注册 /dyn-bgimg/background HTTP 路由,把内存中的图片以字节流提供给浏览器
// 2. read_image RPC:读取本地图片文件(≤5MB, png/jpg/jpeg/webp/gif),存入内存并返回 URL
// 3. 插件激活时自动加载 DEFAULT_IMAGE
return {
  apply(ctx) {
    const fs = ctx.get('fs')
    const webServer = ctx.get('webServer')

    // 设为本地图片路径(如 'C:\\Users\\you\\Desktop\\bg.jpg')则插件激活时自动加载;
    // 设为空字符串则关闭自动加载。
    const DEFAULT_IMAGE = ''
    const MIME = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif'
    }
    const MAX_BYTES = 5 * 1024 * 1024

    let currentImage = null

    if (webServer !== undefined) {
      const unregister = webServer.register({
        kind: 'exact',
        path: '/dyn-bgimg/background',
        handler(req, res) {
          if (currentImage === null) {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('no image loaded')
            return
          }
          res.writeHead(200, {
            'Content-Type': currentImage.mime,
            'Cache-Control': 'no-store'
          })
          res.end(currentImage.bytes)
        }
      })
      ctx.effect(() => unregister)
    }

    async function loadImage(path) {
      if (fs === undefined) throw new Error('当前环境未提供文件系统服务')
      const match = path.match(/\.([a-z0-9]+)$/i)
      if (!match) throw new Error('无法识别文件类型,请使用 png/jpg/jpeg/webp/gif 图片')
      const mime = MIME[match[1].toLowerCase()]
      if (!mime) throw new Error('仅支持 png/jpg/jpeg/webp/gif 图片')
      const target = await fs.resolve(path)
      const bytes = await fs.readBytes(target, undefined, MAX_BYTES)
      currentImage = { bytes, mime }
      return { ok: true, url: '/dyn-bgimg/background?v=' + Date.now(), bytes: bytes.length }
    }

    harness.handle('read_image', async (args) => {
      const path = args && typeof args.path === 'string' ? args.path.trim() : ''
      if (!path) return { ok: false, error: '请输入图片路径' }
      if (webServer === undefined) return { ok: false, error: '当前环境未提供 webServer 服务,无法通过 HTTP 提供图片' }
      try {
        return await loadImage(path)
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) }
      }
    })

    if (DEFAULT_IMAGE) {
      loadImage(DEFAULT_IMAGE).then(
        (r) => console.log('bgimg: default image ready, url:', r.url, 'bytes:', r.bytes),
        (err) => console.log('bgimg: default load failed:', String((err && err.message) || err))
      )
    }
  }
}
