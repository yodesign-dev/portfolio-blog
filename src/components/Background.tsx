import {CONTACT_EMAIL, LINKEDIN_URL} from '@/lib/site'

// Dải lý lịch ngay dưới hero: khách thấy trong vài giây Bin đã làm với sản phẩm nào,
// trong lĩnh vực gì và liên hệ ở đâu, trước khi xem dự án. Chỉ ghi tên có trong bài
// viết hoặc lời giới thiệu thật.
const PRODUCTS = ['Vieclam24h', 'OPNCORP', 'VentureHaven', 'TIKI.VN', 'LaLa', 'AhaMove', 'Liike']
const DOMAINS = ['Recruitment', 'B2B marketplace', 'E-commerce', 'Food delivery', 'Logistics', 'Social']

const labelClass = 'text-xs font-semibold uppercase tracking-widest text-neutral-400'
const linkClass =
  'inline-flex min-h-11 items-center text-[15px] font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-4 [overflow-wrap:anywhere] transition-colors hover:text-brand hover:decoration-brand sm:min-h-0'

export function Background() {
  return (
    <section aria-label="Background" className="border-b border-neutral-200">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] md:gap-10">
        <div>
          <h2 className={labelClass}>Products I&apos;ve worked on</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-lg font-semibold leading-relaxed text-neutral-900">
            {PRODUCTS.map((product) => (
              <li key={product}>{product}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={labelClass}>Domains</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{DOMAINS.join(', ')}</p>
        </div>
        <div>
          <h2 className={labelClass}>Contact</h2>
          <ul className="mt-2 flex flex-col sm:mt-3 sm:gap-1">
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                LinkedIn ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
