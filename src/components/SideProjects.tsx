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
//    khoản nên thẻ tự kể mục đích + tính năng, không dẫn link sang tường đăng nhập. Ảnh là
//    ảnh chụp app thật (bản máy tính + điện thoại) nhưng số liệu đã thay bằng số mẫu trước
//    khi chụp: tên người nhận, số tài khoản, số tiền thật không được lên trang công khai.
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

// Link chữ cao 44 px cho dễ bấm; chỉ về đúng cỡ chữ khi màn rộng VÀ dùng chuột, vì điện thoại
// xoay ngang cũng rộng hơn sm mà vẫn bấm bằng ngón tay
const cafeLinkClass =
  'inline-flex min-h-11 items-center text-sm font-semibold text-[#e8b27d] transition-colors hover:text-[#f0c294] focus-visible:underline sm:pointer-fine:min-h-0'

// Ba bước quét ảnh, đúng thứ tự trong app: chiều tiền do người dùng chọn TRƯỚC (AI không biết
// ai là chủ tài khoản nên không đoán vào/ra), AI điền form, người dùng kiểm tra rồi mới lưu.
const FINANCE_SCAN_STEPS = ['Pick money in or out', 'Snap the transfer screenshot', 'Check the filled form, then save']

const FINANCE_FEATURES = [
  {title: 'Search and filter', body: 'By transaction code, bank, month or a custom date range.'},
  {title: 'Monthly chart', body: 'Money in against money out for the last six months.'},
  {title: 'Excel export', body: 'The filtered list with its totals, ready to share.'},
  {title: 'Saved recipients', body: 'Name, account and bank saved once, then picked from a searchable list.'},
]

export async function SideProjects() {
  const cafe = await sanityFetch<CafeInfo>({query: CAFE_QUERY, revalidate: 300}).catch(() => null)
  // Sanity lỗi thì số về 0: ẩn hẳn, không hiện "0 tracks"
  const stats = [
    {value: cafe?.places, label: 'places'},
    {value: cafe?.tracks, label: 'tracks'},
    {value: cafe?.updates, label: 'updates', more: ' shipped'},
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
          {/* Hai cột từ md (không đợi lg): điện thoại xoay ngang rộng ~800px mà chỉ cao ~375px, để một
              cột thì cửa sổ quán chiếm trọn màn hình, không thấy tên project */}
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-8 lg:gap-10">
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
                <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 lg:gap-x-8">
                  {stats.map((stat) => (
                    <div key={stat.label} className="flex flex-col-reverse">
                      {/* Dưới lg cột chữ hẹp (điện thoại, tablet, xoay ngang): bỏ chữ "shipped" để 3 số
                          nằm vừa một hàng */}
                      <dt className="text-sm text-white/60">
                        {stat.label}
                        {stat.more && <span className="max-lg:hidden">{stat.more}</span>}
                      </dt>
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
          <div className="mt-8 flex items-center gap-3 sm:mt-10 sm:gap-4">
            <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
            <p className="whitespace-nowrap font-mono text-xs uppercase tracking-wider text-[#e8b27d] sm:tracking-widest">
              Same café, other places
            </p>
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
          className="mt-10 grid grid-cols-1 items-center gap-8 border-2 border-neutral-900 bg-white p-5 shadow-hard sm:p-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10"
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
            <h4 className="mt-6 font-mono text-xs uppercase tracking-widest text-neutral-500">How a scan works</h4>
            <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FINANCE_SCAN_STEPS.map((step, index) => (
                <li key={step} className="flex gap-2 border-2 border-neutral-900 bg-neutral-50 px-3 py-2.5 text-sm leading-snug text-neutral-800 sm:flex-col sm:gap-1">
                  <span aria-hidden="true" className="font-mono text-xs font-bold text-brand">
                    0{index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <h4 className="mt-6 font-mono text-xs uppercase tracking-widest text-neutral-500">Also in the app</h4>
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {FINANCE_FEATURES.map((feature) => (
                <li key={feature.title} className="border-t-2 border-neutral-900 pt-2.5">
                  <p className="text-sm font-semibold text-neutral-900">{feature.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">{feature.body}</p>
                </li>
              ))}
            </ul>
            {/* Không có link: app chỉ có màn đăng nhập, dẫn sang đó là ngõ cụt. Ghi "AI" chung,
                không nêu tên model (theo ý Bin 2026-11-23). */}
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-200 pt-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
              <div className="flex gap-2">
                <dt>Built with</dt>
                <dd className="text-neutral-900">Next.js · Supabase · AI vision</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">Access</dt>
                <dd>Sign-in only · No public demo</dd>
              </div>
            </dl>
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

// Ảnh chụp Finance Tracker trong khung thiết bị dựng bằng CSS (không dùng ảnh mockup tải về:
// nét ở mọi độ phân giải, nhẹ, không vướng bản quyền). Từ sm: laptop làm nền, điện thoại đè
// góc phải dưới. Điện thoại dọc (dưới sm) chỉ hiện điện thoại cho to: thu ảnh máy tính về
// ~300px thì không đọc được chữ nào. Số liệu trong ảnh là số mẫu (xem đầu file).
function FinancePreview() {
  return (
    <figure className="mx-auto w-full max-w-2xl">
      <div className="relative sm:pb-12 sm:pr-10">
        {/* Laptop: viền màn hình + camera, rồi đế máy rộng hơn màn một chút. px-[5%] chừa chỗ
            cho phần đế thò ra hai bên, kẻo đế chạm viền thẻ */}
        <div className="px-[5%] max-sm:hidden">
          <div className="rounded-t-[14px] border-2 border-neutral-900 bg-neutral-900 px-[2.2%] pb-[2.2%] pt-[3%]">
            <span aria-hidden="true" className="mx-auto mb-[1.6%] block size-1.5 rounded-full bg-neutral-600" />
            <div className="overflow-hidden rounded-[3px] bg-[#f4f2ee]">
              <Image
                src="/side/finance-desktop.jpg"
                alt="Finance Tracker on desktop: this month's balance, money in and money out, recent transactions, quick add and a six-month chart"
                width={1204}
                height={993}
                sizes="(min-width: 1152px) 560px, (min-width: 1024px) 48vw, (min-width: 640px) 76vw, 1px"
                className="h-auto w-full"
              />
            </div>
          </div>
          <div aria-hidden="true" className="relative -mx-[6%] h-3 rounded-b-xl border-2 border-t-0 border-neutral-900 bg-neutral-300 sm:h-4">
            <span className="absolute left-1/2 top-0 h-1.5 w-[16%] -translate-x-1/2 rounded-b-md bg-neutral-400" />
          </div>
        </div>
        {/* Điện thoại: viền dày bo tròn + "đảo" camera */}
        <div className="mx-auto w-[64%] max-w-60 rounded-[2rem] border-2 border-neutral-900 bg-neutral-900 p-[3.5%] shadow-hard sm:absolute sm:bottom-0 sm:right-0 sm:mx-0 sm:w-[27%] sm:max-w-none sm:rounded-[1.4rem] sm:p-[2.2%]">
          {/* Dải trên cùng thay cho thanh trạng thái, để "đảo" camera không che header của app */}
          <div className="relative overflow-hidden rounded-[1.5rem] bg-[#f4f2ee] pt-[11%] sm:rounded-[1rem]">
            <span aria-hidden="true" className="absolute left-1/2 top-[2.2%] h-[3.2%] w-[30%] -translate-x-1/2 rounded-full bg-neutral-900" />
            <Image
              src="/side/finance-mobile.jpg"
              alt="Finance Tracker on a phone: balance card, recent transactions and Scan and manual entry buttons"
              width={780}
              height={1506}
              sizes="(min-width: 1152px) 180px, (min-width: 1024px) 15vw, (min-width: 640px) 27vw, 240px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-xs text-neutral-500">
        Screenshots of the app, with sample data
      </figcaption>
    </figure>
  )
}
