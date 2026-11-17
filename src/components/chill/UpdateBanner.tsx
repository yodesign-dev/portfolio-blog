'use client'

// Banner 1 lần phía trên thanh nhạc cho tin lớn (Studio: mục "Có gì mới" bật "Hiện banner trong
// quán"). Khác thông báo nhỏ dưới nút "Có gì mới": hiện cho cả khách mới, đứng yên tới khi khách
// bấm, và nút chính làm luôn việc của "Thử ngay" (vd chuyển trạm + phát nhạc).
// Hiện lúc nào, 1 lần mỗi máy: ChillRoom.tsx (BANNER_KEY)
//
// Một dòng (cao 44 px, cảm ứng 52 px) để không che mèo / phin / ly trên quầy: ✨ MỚI · tiêu đề (dài
// thì cắt "…", bấm vào mở "Có gì mới") · nút chính · ẩn. `dimmed` = mèo đang nói ngay cạnh → banner
// mờ đi, tạm không bấm được (không tính là đã đóng). Đang có focus bàn phím bên trong thì không mờ
// Màn 640–1023 px: nút sổ tròn (ChillRoom, right-5 bottom-[124px]) nằm đúng mép phải dòng này → chừa chỗ
// (màn thấp nằm ngang cũng vậy: nút sổ hạ xuống theo thanh nhạc 1 hàng, vẫn ở mép phải dòng này)

import {useState} from 'react'
import type {ChillUpdate} from './Changelog'
import {useLang, useT} from './i18n'

export function UpdateBanner({
  update,
  onTry,
  onMore,
  onClose,
  dimmed = false,
}: {
  update: ChillUpdate
  onTry: () => void
  onMore: () => void
  onClose: () => void
  dimmed?: boolean
}) {
  const t = useT()
  const lang = useLang()
  const [focused, setFocused] = useState(false)
  const en = lang === 'en'
  const title = (en && update.titleEn?.trim()) || update.title
  const custom = (en ? update.actionLabelEn?.trim() : update.actionLabel?.trim()) || ''
  const tryLabel = custom || (update.action?.startsWith('station:') ? t.updates.bannerListen : t.common.tryIt)
  const dim = dimmed && !focused
  return (
    <div
      role="status"
      inert={dim}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      className={`absolute inset-x-0 bottom-full mb-3 flex sm:max-lg:right-14 min-h-11 items-center gap-2 rounded-full border border-[#e8b27d]/35 bg-[#1b1a21]/95 py-1 pl-3 pr-1 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md transition-opacity duration-300 touch:min-h-[52px] ${
        dim ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <span aria-hidden className="shrink-0 text-sm leading-none">
        ✨
      </span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9fdcbc] max-[359px]:sr-only">{t.updates.bannerLabel}</span>
      {/* Tiêu đề: bấm để đọc đủ trong "Có gì mới" */}
      <button
        type="button"
        onClick={onMore}
        title={title}
        aria-label={`${title} · ${t.updates.bannerMore}`}
        className="min-h-9 min-w-0 flex-1 truncate text-left text-sm font-medium text-[#ede6dd] underline decoration-[#ede6dd]/35 decoration-dotted underline-offset-4 transition hover:decoration-[#ede6dd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] touch:min-h-11"
      >
        {title}
      </button>
      <button
        type="button"
        onClick={onTry}
        className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#e8b27d] px-3.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] touch:h-11"
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
        </svg>
        {tryLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.updates.hideBanner}
        title={t.updates.hideBanner}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#a79e94] transition hover:bg-white/10 hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d] touch:h-11 touch:w-11"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}
