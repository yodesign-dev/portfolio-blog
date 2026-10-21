// Manifest PWA riêng của /chill: cài quán thành ứng dụng "Lofi Pixel Cafe" mở thẳng vào quán.
// Không đặt ở app/manifest.ts (cả site) để trang portfolio, blog không hiện gợi ý cài.
// page.tsx trỏ tới đây qua metadata.manifest; icon làm từ mèo quán (docs/youtube/avatar.png).

export const dynamic = 'force-static'

const manifest = {
  id: '/chill',
  name: 'Lofi Pixel Cafe',
  short_name: 'Lofi Pixel Cafe',
  description: 'A pixel café by a window in Vietnam: lo-fi music, rain, a phin timer and a sleepy cat.',
  lang: 'vi',
  start_url: '/chill?ref=app',
  scope: '/chill',
  display: 'standalone',
  orientation: 'any',
  // Trùng màu nền quán để lúc mở ứng dụng không chớp trắng
  background_color: '#16131a',
  theme_color: '#16131a',
  categories: ['music', 'productivity', 'lifestyle'],
  icons: [
    {src: '/chill/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
    {src: '/chill/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
    {src: '/chill/app/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
  ],
}

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600'},
  })
}
