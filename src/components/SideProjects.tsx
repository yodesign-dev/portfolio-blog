import Image from 'next/image'
import Link from 'next/link'
import {sanityFetch} from '@/sanity/lib/fetch'
import {TeaserWindow} from '@/components/chill/TeaserWindow'
import {CountUp} from '@/components/CountUp'
import {CHILL_EXTENSION_URL, NOTION_TEMPLATE_URL, YOUTUBE_URL} from '@/lib/site'

// Mục "Side projects" trang chủ (thay khối giới thiệu /chill cũ): quán lofi là thẻ lớn,
// Notion template và kênh YouTube là 2 thẻ nhỏ mọc ra từ quán, cùng khung tối kiểu pixel café.
// Số liệu của quán đọc từ Studio với cùng điều kiện như /chill, nên thêm cảnh hay đăng cập
// nhật là trang chủ tự đổi theo.

// Trạm Noel không tính vì ngoài mùa khách không thấy.
const CAFE_QUERY = `{
  "places": count(*[_type == "chillDestination" && hidden != true && defined(slug.current)
    && defined(morning.asset) && defined(afternoon.asset) && defined(night.asset)]),
  "tracks": count(*[_type == "chillTrack" && hidden != true && station != "noel" && (defined(audio.asset) || defined(localFile))]),
  "updates": count(*[_type == "chillUpdate" && defined(title) && defined(date) && count(items) > 0])
}`

type CafeInfo = {
  places: number
  tracks: number
  updates: number
}

// Link chữ cao 44 px trên mobile cho dễ bấm, từ sm trở lên về đúng cỡ chữ
const ctaClass =
  'inline-flex min-h-11 items-center text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:underline sm:min-h-0'

export async function SideProjects() {
  const cafe = await sanityFetch<CafeInfo>({query: CAFE_QUERY, revalidate: 300}).catch(() => null)
  // Sanity lỗi thì số về 0: ẩn hẳn, không hiện "0 tracks"
  const stats = [
    {value: cafe?.places, label: 'places'},
    {value: cafe?.tracks, label: 'tracks'},
    {value: cafe?.updates, label: 'updates shipped'},
  ].filter((stat) => stat.value)

  return (
    <section id="side-projects" aria-labelledby="side-projects-title" className="scroll-mt-24 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 id="side-projects-title" className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Side projects
          </h2>
          <p className="mt-2 text-neutral-500">
            A lofi café I designed and built with AI — and the things that grew out of it.
          </p>
        </div>

        <article className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
          <TeaserWindow />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Web app · Live · Free</p>
            <h3 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight text-neutral-900">Lofi Pixel Café</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
              A phin coffee timer by a café window, built with AI.
            </p>
            {stats.length > 0 && (
              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="text-sm text-neutral-500">{stat.label}</dt>
                    <dd className="text-4xl font-extrabold leading-[1.1] tracking-[-0.04em] text-neutral-900">
                      <CountUp value={stat.value as number} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-6 sm:mt-5 sm:gap-y-2">
              <Link href="/chill" className={ctaClass}>
                Take a seat →
              </Link>
              <a
                href={CHILL_EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:underline sm:min-h-0"
              >
                Chrome extension ↗
              </a>
            </div>
          </div>
        </article>

        <div className="mt-10 grid grid-cols-1 gap-8 border-t border-neutral-200 pt-10 md:grid-cols-2">
          <SmallCard
            href={NOTION_TEMPLATE_URL}
            src="/side/notion-template.jpg"
            alt="Hanoi Café Workspace Notion template: a live café window above Today and Quick notes"
            label="Notion template · Free"
            title="Hanoi Café Workspace"
            body="The café window inside Notion."
            cta="Duplicate for free ↗"
          />
          <SmallCard
            href={YOUTUBE_URL}
            src="/side/youtube-hanoi-night.jpg"
            alt="Lofi Pixel Cafe video thumbnail: Hanoi rainy night, lo-fi for study and relax"
            label="YouTube channel"
            title="Lofi Pixel Cafe"
            body="Lo-fi mixes from the café window."
            cta="Listen on YouTube ↗"
          />
        </div>
      </div>
    </section>
  )
}

function SmallCard({
  href,
  src,
  alt,
  label,
  title,
  body,
  cta,
}: {
  href: string
  src: string
  alt: string
  label: string
  title: string
  body: string
  cta: string
}) {
  return (
    <article className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 sm:gap-5">
      <CoverLink href={href} src={src} alt={alt} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
        <h3 className="mt-1.5 text-lg font-bold leading-snug text-neutral-900">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{body}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className={`sm:mt-3 ${ctaClass}`}>
          {cta}
        </a>
      </div>
    </article>
  )
}

// Ảnh bìa trong cùng khung tối với ô cửa sổ quán (TeaserWindow) để các thẻ đồng bộ
function CoverLink({href, src, alt}: {href: string; src: string; alt: string}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={-1}
      className="group block border border-white/15 bg-[#0f0d12] p-1.5 transition-colors hover:border-[#e8b27d]/60 sm:p-2"
    >
      <span className="relative block aspect-video overflow-hidden bg-[#16131a]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1152px) 210px, (min-width: 768px) 20vw, 40vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      </span>
    </a>
  )
}
