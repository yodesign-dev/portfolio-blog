// Service worker của ứng dụng "Lofi Pixel Cafe" (PWA trang /chill).
//
// Đặt ở gốc site (không phải /chill/sw.js) để được phạm vi '/chill' — gồm cả trang /chill
// lẫn /chill/… (sw ở /chill/ chỉ tới được '/chill/', không có '/chill'). Đăng ký trong
// ChillRoom (chỉ bản production), phạm vi { scope: '/chill' }.
//
// - Trang /chill: lấy mạng trước; mất mạng thì trả màn "Quán đang mất sóng"
// - Tranh, hình, tiếng nền của quán (/chill/scenes, /chill/sfx, …) + JS/CSS của Next
//   (/_next/static, có hash trong tên): lấy bản đã lưu cho nhanh, đồng thời tải bản mới
//   ở nền cho lần sau (tranh cùng tên có thể được thay, vd interior.webp)
// - API, nhạc trên Sanity, mọi thứ khác: không đụng tới

const CACHE = 'chill-v1'
const ASSET = /^\/(chill\/(scenes|sfx|app|emoji|donate)\/|chill\/(cat|sprites)\.webp$|_next\/static\/)/

const OFFLINE_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lofi Pixel Cafe</title>
<style>
  html,body{margin:0;height:100%;background:#16131a;color:#ede6dd;font-family:system-ui,-apple-system,sans-serif}
  main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
  img{width:120px;height:120px;border-radius:24px;image-rendering:pixelated}
  h1{font-size:20px;margin:6px 0 0;font-weight:600}
  p{margin:0;color:#a79e94;font-size:14px;line-height:1.6;max-width:320px}
  button{margin-top:6px;border:0;border-radius:999px;background:#e8b27d;color:#2a1a10;font-weight:600;font-size:14px;padding:10px 20px;cursor:pointer}
</style></head>
<body><main>
  <img src="/chill/app/icon-192.png" alt="">
  <h1>Quán đang mất sóng</h1>
  <p>Mèo vẫn ngủ ở bậu cửa. Có mạng lại là quán mở cửa ngay.<br>The café is offline — it opens again as soon as you're back online.</p>
  <button onclick="location.reload()">Thử lại · Try again</button>
</main>
<script>addEventListener('online',()=>location.reload())</script>
</body></html>`

self.addEventListener('install', (event) => {
  // Lưu sẵn icon cho màn mất sóng; vào thẳng phiên bản mới, không chờ tab cũ đóng
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/chill/app/icon-192.png')).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('chill-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => new Response(OFFLINE_HTML, {headers: {'Content-Type': 'text/html; charset=utf-8'}})),
    )
    return
  }

  if (ASSET.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req)
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok && res.status === 200) void cache.put(req, res.clone())
            return res
          })
          .catch(() => cached ?? Response.error())
        if (cached) {
          event.waitUntil(fresh)
          return cached
        }
        return fresh
      }),
    )
  }
})
