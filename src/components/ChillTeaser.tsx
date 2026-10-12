import Link from 'next/link'
import { TeaserWindow } from '@/components/chill/TeaserWindow'

// Section giới thiệu /chill trên trang chủ, ngay dưới hero: dải nền tối ấm, bên phải là
// chính cảnh quán đang chạy (TeaserWindow), bên trái là lời giới thiệu + nút bước vào.
// Hero hứa "research → hi-fi, faster, with AI" — đây là sản phẩm thật làm theo cách đó.
//
// Lời giới thiệu xoay quanh điểm riêng của quán: đồng hồ tập trung là 1 ly phin nhỏ giọt
// (khách nước ngoài chưa biết phin là gì nên câu đầu giải thích luôn), và mẩu giấy để
// lại trên bàn = phòng chat của quán, tin tự xoá sau 24 giờ.

// Lý do để thử, không phải thông số: không rào cản, độ dài phiên phin, có gì để nghe
const REASONS = ['Free, no sign-up', '15, 25 or 45 minutes', 'Lo-fi and street sounds']

export function ChillTeaser() {
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
            {/* Mỗi câu 1 dòng — để tự xuống dòng thì gãy thành "…until the / last drop." */}
            <span className="block">Brew a phin.</span> <span className="block">Work until the last drop.</span>
          </h2>
          <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-white/70">
            A phin is the little Vietnamese filter that drips coffee one slow drop at a time. Here
            it&apos;s your timer. Sit by a café window in Hà Nội, put some music on, and stop when the
            cup is full.
          </p>
          <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-white/50">
            Leave a note on the table before you go. It&apos;ll be gone by tomorrow.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {REASONS.map((item) => (
              <li key={item} className="border border-white/20 px-3 py-1.5 text-sm font-medium text-white/80">
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/chill"
            className="mt-8 inline-flex h-12 items-center bg-[#e8b27d] px-6 text-sm font-bold text-[#2a1a10] transition-colors hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
          >
            Take a seat →
          </Link>
        </div>
        <div className="order-1 lg:order-2">
          <TeaserWindow />
        </div>
      </div>
    </section>
  )
}
