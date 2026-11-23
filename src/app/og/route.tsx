import {ImageResponse} from 'next/og'
import {client} from '@/sanity/lib/client'
import {OG_KINDS, OG_PAGE_TITLES, SITE_NAME, SITE_ROLE} from '@/lib/site'

// Ảnh Open Graph 1200×630 cho link chia sẻ (Facebook, LinkedIn, Slack…):
// /og                          → ảnh mặc định của site
// /og?title=...&kind=Case study → ảnh cho trang/bài không có ảnh đại diện
//
// Chỉ nhận tiêu đề có thật (OG_PAGE_TITLES hoặc tiêu đề bài trong Sanity) và kind trong
// OG_KINDS. Trước đây nhận chữ bất kỳ → ai cũng tạo được ảnh "applebin.me" nói điều mình
// muốn (cache 1 năm), mỗi URL lạ còn tốn 1 lần vẽ. Chữ lạ → chuyển về /og.

// Danh sách tiêu đề bài: 1 query cố định, Data Cache 5 phút → URL lạ không chạm Sanity
async function postTitles(): Promise<Set<string>> {
  try {
    const titles = await client.fetch<string[]>(`*[_type == "post" && defined(title)].title`, {}, {next: {revalidate: 300}})
    return new Set(titles)
  } catch {
    return new Set()
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const {searchParams} = url
  const title = searchParams.get('title') ?? undefined
  const kind = searchParams.get('kind') ?? undefined
  const known = !title || OG_PAGE_TITLES.includes(title) || (await postTitles()).has(title)
  if (!known || (kind && !OG_KINDS.includes(kind)) || [...searchParams.keys()].some((k) => k !== 'title' && k !== 'kind')) {
    return Response.redirect(new URL('/og', url), 302)
  }

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
