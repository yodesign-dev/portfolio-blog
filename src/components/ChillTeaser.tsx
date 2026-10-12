import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import { STATIONS } from '@/components/chill/tracks'
import { TeaserWindow } from '@/components/chill/TeaserWindow'

// Section giới thiệu /chill trên trang chủ, ngay dưới hero: dải nền tối ấm, bên phải là
// chính cảnh quán đang chạy (TeaserWindow), bên trái là lời giới thiệu + nút bước vào.
// Hero hứa "research → hi-fi, faster, with AI" — đây là sản phẩm thật làm theo cách đó.

// Cùng điều kiện "bài đang phát được" với src/app/chill/page.tsx
const TRACK_COUNT_QUERY = `count(*[_type == "chillTrack" && hidden != true && (defined(audio.asset) || defined(localFile))])`

async function getTrackCount(revalidate: number): Promise<number> {
  try {
    return await client.fetch<number>(TRACK_COUNT_QUERY, {}, { next: { revalidate } })
  } catch {
    // Sanity lỗi → bỏ dòng số bài, section vẫn hiện
    return 0
  }
}

export async function ChillTeaser({ revalidate }: { revalidate: number }) {
  const tracks = await getTrackCount(revalidate)

  return (
    <section aria-labelledby="chill-teaser-title" className="bg-[#16131a] text-white antialiased">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-[#e8b27d]">
            Side project · Designed &amp; built with AI
          </span>
          <h2
            id="chill-teaser-title"
            className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl"
          >
            A window seat in a little Vietnamese café
          </h2>
          <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-white/70">
            Lo-fi music, street sounds and a sleepy cat. Put it on while you work.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {[tracks > 0 ? `${tracks} tracks` : null, `${STATIONS.length} stations`, 'Phin focus timer']
              .filter((item): item is string => item !== null)
              .map((item) => (
                <li key={item} className="border border-white/20 px-3 py-1.5 text-sm font-medium text-white/80">
                  {item}
                </li>
              ))}
          </ul>
          <Link
            href="/chill"
            className="mt-8 inline-flex h-12 items-center bg-[#e8b27d] px-6 text-sm font-bold text-[#2a1a10] transition-colors hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
          >
            Step in →
          </Link>
        </div>
        <div className="order-1 lg:order-2">
          <TeaserWindow />
        </div>
      </div>
    </section>
  )
}
