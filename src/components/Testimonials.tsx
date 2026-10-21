import Image from 'next/image'
import {sanityFetch} from '@/sanity/lib/fetch'
import {urlFor} from '@/sanity/lib/image'

// Mục "What people say" trang chủ — lời giới thiệu nhập trong Studio ("Lời giới
// thiệu"). Chưa có bài nào thì cả mục ẩn. Từ 3 bài: dải thẻ chạy ngang liên tục,
// mép mờ dần, dừng khi rê chuột (mẫu Testimonial của Superdesign, dựng lại bằng
// CSS). Ít hơn 3 bài: thẻ đứng yên. Giảm chuyển động: dải đứng yên, cuộn ngang tay.

type Testimonial = {
  _id: string
  quote: string
  name: string
  role?: string
  company?: string
  relation?: string
  link?: string
  avatar?: {asset?: {_ref: string}}
}

const TESTIMONIALS_QUERY = `*[_type == "testimonial" && defined(quote) && defined(name)] | order(order asc, _createdAt asc) {
  _id, quote, name, role, company, relation, link, avatar
}`

// Dưới số này thì dải chạy trông lặp lộ liễu — hiện thẻ đứng yên
const MARQUEE_MIN = 3

export async function Testimonials() {
  const items = await sanityFetch<Testimonial[]>({query: TESTIMONIALS_QUERY, revalidate: 300}).catch(() => [])
  if (items.length === 0) return null

  return (
    <section aria-labelledby="testimonials-title" className="pt-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <h2 id="testimonials-title" className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          What people say
        </h2>
        <p className="mt-2 text-neutral-500">Words from people I’ve worked with.</p>
      </div>

      {items.length < MARQUEE_MIN ? (
        <ul className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 px-6 sm:px-8 md:grid-cols-2">
          {items.map((item) => (
            <li key={item._id}>
              <Card item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="group mt-10 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-x-auto">
          {/* Danh sách nhân đôi, trượt đúng nửa chiều dài rồi lặp → liền mạch.
              Bản sao ẩn với trình đọc màn hình, không nhận Tab, ẩn hẳn khi giảm chuyển động. */}
          <ul
            className="flex w-max gap-6 px-3 animate-[testimonial-marquee_var(--marquee-duration)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:px-6"
            style={{'--marquee-duration': `${items.length * 9}s`} as React.CSSProperties}
          >
            {[...items, ...items].map((item, i) => {
              const copy = i >= items.length
              return (
                <li key={`${item._id}-${i}`} aria-hidden={copy || undefined} className={`w-[300px] shrink-0 sm:w-[360px] ${copy ? 'motion-reduce:hidden' : ''}`}>
                  <Card item={item} copy={copy} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

function Card({item, copy = false}: {item: Testimonial; copy?: boolean}) {
  const avatarUrl = item.avatar?.asset ? urlFor(item.avatar)?.width(96).height(96).fit('crop').url() : null
  const initials = item.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()
  const meta = [item.role, item.company].filter(Boolean).join(' · ')

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6">
      <svg viewBox="0 0 32 24" aria-hidden className="h-6 w-8 text-brand/25">
        <path
          fill="currentColor"
          d="M0 24V14.4C0 6.6 4.2 1.8 12.6 0l1.5 3.3C9.6 4.6 7.3 7 7 10.8h6V24H0Zm18 0V14.4C18 6.6 22.2 1.8 30.6 0l1.4 3.3C27.6 4.6 25.3 7 25 10.8h6V24H18Z"
        />
      </svg>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-neutral-700">“{item.quote}”</blockquote>
      <figcaption className="mt-6 flex min-h-[4.75rem] items-center gap-3 border-t border-neutral-100 pt-5">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
            {initials}
          </span>
        )}
        <span className="min-w-0">
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={copy ? -1 : undefined}
              className="block truncate text-sm font-semibold text-neutral-900 hover:text-brand"
            >
              {item.name} <span aria-hidden className="text-neutral-300">↗</span>
            </a>
          ) : (
            <span className="block truncate text-sm font-semibold text-neutral-900">{item.name}</span>
          )}
          {meta && <span className="block truncate text-sm text-neutral-500">{meta}</span>}
          {item.relation && <span className="block truncate text-xs text-neutral-400">{item.relation}</span>}
        </span>
      </figcaption>
    </figure>
  )
}
