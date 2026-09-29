import {ImageResponse} from 'next/og'
import {SITE_NAME, SITE_ROLE} from '@/lib/site'

// Ảnh Open Graph 1200×630 cho link chia sẻ (Facebook, LinkedIn, Slack…):
// /og                          → ảnh mặc định của site
// /og?title=...&kind=Case study → ảnh cho trang/bài không có ảnh đại diện
export function GET(request: Request) {
  const {searchParams} = new URL(request.url)
  const title = searchParams.get('title')?.slice(0, 140)
  const kind = searchParams.get('kind')?.slice(0, 40)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          backgroundColor: '#002fff',
          color: 'white',
        }}
      >
        <div style={{display: 'flex', fontSize: 28, letterSpacing: 4, opacity: 0.8}}>
          {`${SITE_NAME} · ${SITE_ROLE}`.toUpperCase()}
        </div>

        <div style={{display: 'flex', flexDirection: 'column'}}>
          {kind && (
            <div style={{display: 'flex', fontSize: 30, color: '#00ddff', marginBottom: 20}}>{kind}</div>
          )}
          {title ? (
            <div
              style={{
                display: 'flex',
                fontSize: title.length > 70 ? 56 : 72,
                lineHeight: 1.1,
                letterSpacing: -2,
              }}
            >
              {title}
            </div>
          ) : (
            // Ảnh mặc định: slogan 2 dòng giống hero trang chủ
            <div style={{display: 'flex', flexDirection: 'column', fontSize: 96, lineHeight: 1.05, letterSpacing: -3}}>
              <div style={{display: 'flex'}}>Learn by Sharing</div>
              <div style={{display: 'flex'}}>Share by Learning</div>
            </div>
          )}
        </div>

        <div style={{display: 'flex', fontSize: 28, opacity: 0.8}}>applebin.me</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable'},
    }
  )
}
