import Image from 'next/image'
import {sanityFetch} from '@/sanity/lib/fetch'
import {urlFor} from '@/sanity/lib/image'

// Mục "What people say" trang chủ — lời giới thiệu nhập trong Studio ("Lời giới
// thiệu"). Chưa có bài nào thì cả mục ẩn. Bài có "Câu nổi bật" hiện lớn ở đầu mục,
// các bài còn lại là thẻ đứng yên (dưới md: vuốt ngang từng thẻ). Không dùng dải tự
// chạy nữa vì khó dừng lại đọc hết.

type Testimonial = {
  _id: string
  quote: string
  highlight?: string
  name: string
  role?: string
  company?: string
  relation?: string
  link?: string
  avatar?: {asset?: {_ref: string}}
}

const TESTIMONIALS_QUERY = `*[_type == "testimonial" && defined(quote) && defined(name)] | order(order asc, _createdAt asc) {
  _id, quote, highlight, name, role, company, relation, link, avatar
}`

export async function Testimonials() {
  const items = await sanityFetch<Testimonial[]>({query: TESTIMONIALS_QUERY, revalidate: 300}).catch(() => [])
  if (items.length === 0) return null
  const featured = items.find((item) => item.highlight?.trim()) ?? items[0]
  const others = items.filter((item) => item !== featured)

  return (
    <section aria-labelledby="testimonials-title" className="pt-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <h2 id="testimonials-title" className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          What people say
        </h2>
        <p className="mt-2 text-neutral-500">Words from people I’ve worked with.</p>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-6 sm:px-8">
        <Featured item={featured} />
      </div>

      {others.length > 0 && (
        <ul className="mx-auto mt-6 flex max-w-6xl snap-x snap-mandatory scroll-pl-6 gap-4 overflow-x-auto px-6 py-2 [scrollbar-width:none] sm:scroll-pl-8 sm:px-8 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
          {others.map((item) => (
            <li key={item._id} className="w-[80vw] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none">
              <Card item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Person({item}: {item: Testimonial}) {
  const avatarUrl = item.avatar?.asset ? urlFor(item.avatar)?.width(96).height(96).fit('crop').url() : null
  // Chữ đầu của từ đầu + từ cuối ("Tu Le Nguyen Anh" → "TA")
  const words = item.name.trim().split(/\s+/)
  const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
  const meta = [item.role, item.company].filter(Boolean).join(' · ')

  return (
    <figcaption className="flex items-center gap-3">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
          {initials}
        </span>
      )}
      <span className="min-w-0">
        {item.link ? (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-neutral-900 hover:text-brand">
            {item.name} <span aria-hidden className="text-neutral-300">↗</span>
          </a>
        ) : (
          <span className="block truncate text-sm font-semibold text-neutral-900">{item.name}</span>
        )}
        {meta && <span className="block truncate text-sm text-neutral-500">{meta}</span>}
        {item.relation && <span className="block truncate text-xs text-neutral-400">{item.relation}</span>}
      </span>
    </figcaption>
  )
}

function Featured({item}: {item: Testimonial}) {
  return (
    <figure>
      <blockquote className="max-w-4xl text-balance text-2xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
        “{item.highlight?.trim() || item.quote}”
      </blockquote>
      <div className="mt-6">
        <Person item={item} />
      </div>
    </figure>
  )
}

function Card({item}: {item: Testimonial}) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6">
      <blockquote className="flex-1 text-[15px] leading-relaxed text-neutral-700">“{item.quote}”</blockquote>
      <div className="mt-6 border-t border-neutral-100 pt-5">
        <Person item={item} />
      </div>
    </figure>
  )
}
