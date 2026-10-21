import Image from 'next/image'
import Link from 'next/link'
import {sanityFetch} from '@/sanity/lib/fetch'
import {TeaserWindow} from '@/components/chill/TeaserWindow'
import {NOTION_TEMPLATE_URL, YOUTUBE_URL} from '@/lib/site'

// Mục "Side projects" trang chủ (thay khối giới thiệu /chill cũ): quán lofi, Notion
// template và kênh YouTube — 3 thẻ ngang hàng, cùng khung tối kiểu pixel café.
// Thẻ quán gắn bản cập nhật mới nhất trong nhật ký thay đổi (Studio: "Chill · Nhật ký
// thay đổi"), đăng bản mới là trang chủ tự đổi theo.


const LATEST_UPDATE_QUERY = `*[_type == "chillUpdate"] | order(date desc)[0]{title, titleEn, date}`

type LatestUpdate = {title: string; titleEn?: string; date: string} | null

function shortDate(date: string) {
  // date dạng YYYY-MM-DD — đọc theo UTC để không lệch ngày theo múi giờ server
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'})
}

export async function SideProjects() {
  const latest = await sanityFetch<LatestUpdate>({query: LATEST_UPDATE_QUERY, revalidate: 300}).catch(() => null)

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

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          <Card
            media={<TeaserWindow />}
            label="Web app · Live"
            title="Lofi Pixel Café"
            body="A phin coffee timer by a café window in Hà Nội, with lo-fi music, street sounds and a table to work alongside friends."
            update={latest ? `Updated ${shortDate(latest.date)} · ${latest.titleEn?.trim() || latest.title}` : undefined}
            cta={{href: '/chill', label: 'Take a seat →'}}
          />
          <Card
            media={<CoverLink href={NOTION_TEMPLATE_URL} src="/side/notion-template.jpg" alt="Hanoi Café Workspace Notion template: a live café window above Today and Quick notes" />}
            label="Notion template · Free"
            title="Hanoi Café Workspace"
            body="The café window inside Notion — music, rain and the train street on top of your top 3 for today and a goal for each day of the week. English and Vietnamese."
            cta={{href: NOTION_TEMPLATE_URL, label: 'Duplicate for free ↗', external: true}}
          />
          <Card
            media={<CoverLink href={YOUTUBE_URL} src="/side/youtube-hanoi-night.jpg" alt="Lofi Pixel Cafe video thumbnail: Hanoi rainy night, lo-fi for study and relax" />}
            label="YouTube channel"
            title="Lofi Pixel Cafe"
            body="Lo-fi mixes recorded straight from the café window — like a rainy night in Hà Nội — to study or work to."
            cta={{href: YOUTUBE_URL, label: 'Listen on YouTube ↗', external: true}}
          />
        </div>
      </div>
    </section>
  )
}

function Card({
  media,
  label,
  title,
  body,
  update,
  cta,
}: {
  media: React.ReactNode
  label: string
  title: string
  body: string
  update?: string
  cta: {href: string; label: string; external?: boolean}
}) {
  const ctaClass =
    'mt-5 inline-flex text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:underline'
  return (
    <article className="flex flex-col">
      {media}
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <h3 className="mt-1.5 text-lg font-semibold leading-snug text-neutral-900">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{body}</p>
      {update && (
        <p className="mt-3 flex items-start gap-2 text-sm font-medium text-neutral-800">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          {update}
        </p>
      )}
      <div className="mt-auto">
        {cta.external ? (
          <a href={cta.href} target="_blank" rel="noopener noreferrer" className={ctaClass}>
            {cta.label}
          </a>
        ) : (
          <Link href={cta.href} className={ctaClass}>
            {cta.label}
          </Link>
        )}
      </div>
    </article>
  )
}

// Ảnh bìa trong cùng khung tối với ô cửa sổ quán (TeaserWindow) để 3 thẻ đồng bộ
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
          sizes="(min-width: 1152px) 352px, (min-width: 768px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      </span>
    </a>
  )
}
