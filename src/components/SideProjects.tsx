import Image from 'next/image'
import Link from 'next/link'
import {sanityFetch} from '@/sanity/lib/fetch'
import {TeaserWindow} from '@/components/chill/TeaserWindow'
import {CountUp} from '@/components/CountUp'
import {CHILL_EXTENSION_URL, NOTION_TEMPLATE_URL, YOUTUBE_URL} from '@/lib/site'

// Mục "Side projects" trang chủ, gồm 2 project tách bạch:
// 1. Lofi Pixel Café: một tấm nền tối kiểu pixel café bao cả web app lẫn các nơi khác của
//    cùng project (kênh YouTube, Chrome extension, Notion template), để người xem thấy đây
//    là một thứ chứ không phải 4 project rời.
// 2. Finance Tracker: thẻ giấy sáng như phần còn lại của trang. App chỉ vào được khi có tài
//    khoản nên thẻ tự kể mục đích + tính năng, không dẫn link sang tường đăng nhập.
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
const cafeLinkClass =
  'inline-flex min-h-11 items-center text-sm font-semibold text-[#e8b27d] transition-colors hover:text-[#f0c294] focus-visible:underline sm:min-h-0'

const FINANCE_FEATURES = [
  {title: 'Scan a transfer', body: 'Snap a bank transfer screenshot and AI fills in the amount, date, recipient and bank.'},
  {title: 'Search and filter', body: 'By transaction code, bank, month or a custom date range.'},
  {title: 'Monthly chart', body: 'Money in against money out for the last six months.'},
  {title: 'Excel export', body: 'The filtered list with its totals, ready to share.'},
]

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
          <p className="mt-2 text-neutral-500">Things I design and build with AI, outside client work.</p>
        </div>

        <article
          aria-labelledby="cafe-title"
          className="border-2 border-neutral-900 bg-[#16131a] p-5 text-white shadow-hard sm:p-8"
        >
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
            <TeaserWindow />
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/60">Web app · Live · Free</p>
              <h3 id="cafe-title" className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight text-white">
                Lofi Pixel Café
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                A phin coffee timer by a café window, built with AI.
              </p>
              {stats.length > 0 && (
                <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="flex flex-col-reverse">
                      <dt className="text-sm text-white/60">{stat.label}</dt>
                      <dd className="text-4xl font-extrabold leading-[1.1] tracking-[-0.04em] text-white">
                        <CountUp value={stat.value as number} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <Link href="/chill" className={`mt-2 sm:mt-5 ${cafeLinkClass}`}>
                Take a seat →
              </Link>
            </div>
          </div>

          {/* Dải nối: nói thẳng 3 thẻ dưới là cùng một quán ở nơi khác */}
          <div className="mt-8 flex items-center gap-4 sm:mt-10">
            <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
            <p className="font-mono text-xs uppercase tracking-widest text-[#e8b27d]">Same café, other places</p>
            <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
            <CafeCard
              href={YOUTUBE_URL}
              src="/side/youtube-hanoi-night.jpg"
              alt="Lofi Pixel Cafe video thumbnail: Hanoi rainy night, lo-fi for study and relax"
              sizes="(min-width: 1152px) 500px, (min-width: 768px) 45vw, 90vw"
              label="YouTube channel"
              title="The café window, recorded"
              body="Lo-fi mixes filmed inside the web app: same streets, same rain, same music."
              cta="Watch on YouTube ↗"
              wide
            />
            <CafeCard
              href={CHILL_EXTENSION_URL}
              src="/chill/og.jpg"
              alt="Lofi Pixel Café scene: a café table by the window"
              sizes="(min-width: 1152px) 240px, (min-width: 768px) 22vw, 90vw"
              label="Chrome extension"
              title="The café in your toolbar"
              body="Open the window from any tab."
              cta="Add to Chrome ↗"
            />
            <CafeCard
              href={NOTION_TEMPLATE_URL}
              src="/side/notion-template.jpg"
              alt="Hanoi Café Workspace Notion template: a live café window above Today and Quick notes"
              sizes="(min-width: 1152px) 240px, (min-width: 768px) 22vw, 90vw"
              label="Notion template · Free"
              title="Hanoi Café Workspace"
              body="The café window inside Notion."
              cta="Duplicate for free ↗"
            />
          </div>
        </article>

        <article
          aria-labelledby="finance-title"
          className="mt-10 grid grid-cols-1 items-center gap-8 border-2 border-neutral-900 bg-white p-5 shadow-hard sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10"
        >
          {/* Điện thoại: tên + mô tả trước rồi mới tới hình, kẻo gặp một giao diện lạ chưa có tên */}
          <div className="order-2 lg:order-1">
            <FinancePreview />
          </div>
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-3">
              <Image src="/side/finance-logo.png" alt="" width={450} height={465} sizes="40px" className="h-auto w-10 shrink-0" />
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Web app · Private · Personal use</p>
                <h3 id="finance-title" className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight text-neutral-900">
                  Finance Tracker
                </h3>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-600">
              I built this to keep track of my own money: every transfer in and out, in one place. I log a
              transaction in a few seconds on my phone, then see where the month went.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {FINANCE_FEATURES.map((feature) => (
                <li key={feature.title} className="border-t-2 border-neutral-900 pt-3">
                  <h4 className="text-sm font-semibold text-neutral-900">{feature.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">{feature.body}</p>
                </li>
              ))}
            </ul>
            {/* Không có link: app chỉ có màn đăng nhập, dẫn sang đó là ngõ cụt */}
            <p className="mt-6 font-mono text-xs uppercase tracking-wider text-neutral-500">Sign-in only · No public demo</p>
          </div>
        </article>
      </div>
    </section>
  )
}

// Thẻ con của quán, nằm trên nền tối. Thẻ `wide` (YouTube) nằm ở cột rộng gấp đôi nên ảnh
// lớn gấp đôi, tiêu đề lớn hơn một bậc.
function CafeCard({
  href,
  src,
  alt,
  sizes,
  label,
  title,
  body,
  cta,
  wide,
}: {
  href: string
  src: string
  alt: string
  sizes: string
  label: string
  title: string
  body: string
  cta: string
  wide?: boolean
}) {
  return (
    <div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className="group block border border-white/15 bg-[#0f0d12] p-1.5 transition-colors hover:border-[#e8b27d]/60"
      >
        <span className="relative block aspect-video overflow-hidden bg-[#16131a]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        </span>
      </a>
      <div className="mt-4">
        <p className="font-mono text-xs uppercase tracking-wider text-white/60">{label}</p>
        <h4 className={`mt-1.5 font-semibold leading-snug text-white ${wide ? 'text-xl' : 'text-lg'}`}>{title}</h4>
        <p className="mt-2 text-[15px] leading-relaxed text-white/70">{body}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className={`sm:mt-3 ${cafeLinkClass}`}>
          {cta}
        </a>
      </div>
    </div>
  )
}

// Hình minh hoạ Finance Tracker dựng bằng HTML theo bố cục thật của app (3 ô tổng, biểu đồ
// tiền vào/ra theo tháng, danh sách giao dịch). Số liệu là số mẫu: ảnh chụp thật sẽ lộ
// giao dịch cá nhân. Có ảnh chụp bằng dữ liệu mẫu thì thay khối này bằng ảnh.
const FINANCE_MONTHS = [
  {label: 'Jun', moneyIn: 62, moneyOut: 48},
  {label: 'Jul', moneyIn: 70, moneyOut: 58},
  {label: 'Aug', moneyIn: 55, moneyOut: 66},
  {label: 'Sep', moneyIn: 82, moneyOut: 52},
  {label: 'Oct', moneyIn: 74, moneyOut: 61},
  {label: 'Nov', moneyIn: 90, moneyOut: 57},
]
const FINANCE_ROWS = [
  {name: 'Salary, November', bank: 'Bank A', amount: '+32,000,000', positive: true},
  {name: 'Rent', bank: 'Bank B', amount: '−8,500,000', positive: false},
  {name: 'Lunch', bank: 'E-wallet', amount: '−65,000', positive: false},
]

function FinancePreview() {
  return (
    <figure className="mx-auto w-full max-w-sm">
      <div aria-hidden="true" className="border-2 border-neutral-900 bg-[#f7f8fb] p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            {label: 'Money in', value: '42.5M', color: 'text-[#15803d]'},
            {label: 'Money out', value: '31.2M', color: 'text-[#b91c1c]'},
            {label: 'Balance', value: '11.3M', color: 'text-neutral-900'},
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border border-neutral-200 bg-white px-1.5 py-2 sm:px-2">
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase text-neutral-400">{tile.label}</p>
              <p className={`mt-1 text-base font-bold leading-none ${tile.color}`}>{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-[#2f6fed]/50 bg-[#2f6fed]/5 px-3 py-2">
          <p className="text-xs font-semibold text-neutral-800">Scan a transfer screenshot</p>
          <span className="rounded-md bg-[#2f6fed] px-2 py-1 text-[10px] font-semibold text-white">Scan</span>
        </div>

        <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-[11px] font-semibold text-neutral-800">Money in / money out by month</p>
          <div className="mt-2 flex h-20 items-end justify-between gap-2">
            {FINANCE_MONTHS.map((month) => (
              <div key={month.label} className="flex h-full flex-1 flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-0.5">
                  <span className="w-2 rounded-t-sm bg-[#15803d]" style={{height: `${month.moneyIn}%`}} />
                  <span className="w-2 rounded-t-sm bg-[#b91c1c]" style={{height: `${month.moneyOut}%`}} />
                </div>
                <p className="mt-1 text-center text-[10px] text-neutral-400">{month.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white px-3">
          {FINANCE_ROWS.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-800">{row.name}</p>
                <p className="text-[10px] text-neutral-400">{row.bank}</p>
              </div>
              <p className={`shrink-0 text-xs font-bold ${row.positive ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>{row.amount}</p>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-center font-mono text-xs text-neutral-500">
        Illustration of the app, with sample data
      </figcaption>
    </figure>
  )
}
