import {CONTACT_EMAIL, LINKEDIN_URL} from '@/lib/site'

// Dải lý lịch ngay dưới hero: khách thấy trong vài giây Bin đã làm với sản phẩm nào,
// trong lĩnh vực gì và liên hệ ở đâu, trước khi xem dự án. Chỉ ghi tên có trong bài
// viết hoặc lời giới thiệu thật. Tên hiện dạng chữ, không dùng logo của công ty.
const PRODUCTS = ['Vieclam24h', 'OPNCORP', 'VentureHaven', 'TIKI.VN', 'LaLa', 'AhaMove', 'Liike']
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
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xl font-semibold tracking-tight text-neutral-700 md:justify-between md:gap-x-6 md:text-2xl">
          {PRODUCTS.map((product) => (
            <li key={product}>{product}</li>
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
