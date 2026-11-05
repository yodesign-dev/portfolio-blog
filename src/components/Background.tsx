import Image from 'next/image'
import {CONTACT_EMAIL, LINKEDIN_URL} from '@/lib/site'

// Dải lý lịch ngay dưới hero: khách thấy trong vài giây Bin đã làm với sản phẩm nào,
// trong lĩnh vực gì và liên hệ ở đâu, trước khi xem dự án. Chỉ ghi tên có trong bài
// viết hoặc lời giới thiệu thật. Tên vẫn là chữ; cạnh tên là icon app nhỏ (xám,
// rê chuột mới hiện màu) lấy từ trang chính thức của sản phẩm, đặt trong
// public/logos. Sản phẩm chưa có icon thì hiện ô chữ cái đầu cho thẳng hàng —
// đừng đoán tên miền để lấy icon (dễ ra logo của công ty khác trùng tên).
const PRODUCTS: {name: string; icon?: string}[] = [
  {name: 'Vieclam24h', icon: '/logos/vieclam24h-mark.png'},
  {name: 'OPNCORP'},
  {name: 'VentureHaven'},
  {name: 'TIKI.VN', icon: '/logos/tiki.png'},
  {name: 'LaLa'},
  {name: 'AhaMove', icon: '/logos/ahamove.png'},
  {name: 'Liike'},
  {name: 'Thinkprompt'},
]
const DOMAINS = ['Recruitment', 'B2B marketplace', 'E-commerce', 'Food delivery', 'Logistics', 'Social']

const linkClass =
  'inline-flex min-h-11 items-center text-sm font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-brand hover:decoration-brand sm:min-h-0'

export function Background() {
  return (
    <section aria-label="Background" className="border-b border-neutral-200">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Products I&apos;ve worked on
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-lg font-semibold tracking-tight text-neutral-700 sm:grid-cols-4 md:text-xl lg:text-2xl">
          {PRODUCTS.map(({name, icon}) => (
            <li key={name} className="group flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-neutral-200 md:size-8"
              >
                {icon ? (
                  <Image
                    src={icon}
                    alt=""
                    width={32}
                    height={32}
                    className="size-full object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                  />
                ) : (
                  <span className="text-sm font-semibold text-neutral-400">{name[0]}</span>
                )}
              </span>
              {name}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-4 border-t border-neutral-200 pt-6 md:flex-row md:items-center md:justify-between">
          <ul aria-label="Domains" className="flex flex-wrap gap-2">
            {DOMAINS.map((domain) => (
              <li key={domain} className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600">
                {domain}
              </li>
            ))}
          </ul>
          <p className="flex shrink-0 gap-5">
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              Email
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              LinkedIn ↗
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
