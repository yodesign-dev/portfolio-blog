'use client'

// Banner 1 lần phía trên thanh nhạc cho tin lớn (Studio: mục "Có gì mới" bật "Hiện banner trong
// quán"). Khác thông báo nhỏ dưới nút "Có gì mới": hiện cho cả khách mới, đứng yên tới khi khách
// bấm, và nút chính làm luôn việc của "Thử ngay" (vd chuyển trạm + phát nhạc).
// Hiện lúc nào, 1 lần mỗi máy: ChillRoom.tsx (BANNER_KEY)

import type {ChillUpdate} from './Changelog'
import {useLang, useT} from './i18n'

export function UpdateBanner({
  update,
  onTry,
  onMore,
  onClose,
}: {
  update: ChillUpdate
  onTry: () => void
  onMore: () => void
  onClose: () => void
}) {
  const t = useT()
  const lang = useLang()
  const en = lang === 'en'
  const title = (en && update.titleEn?.trim()) || update.title
  const custom = (en ? update.actionLabelEn?.trim() : update.actionLabel?.trim()) || ''
  const tryLabel = custom || (update.action?.startsWith('station:') ? t.updates.bannerListen : t.common.tryIt)
  return (
    <div
      role="status"
      className="absolute inset-x-0 bottom-full mb-3 flex items-start gap-3 rounded-xl border border-[#e8b27d]/35 bg-[#1b1a21]/95 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md sm:px-4"
    >
      <span aria-hidden className="mt-0.5 text-base leading-none">
        ✨
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9fdcbc]">{t.updates.bannerLabel}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-[#ede6dd]">{title}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={onTry}
            className="flex min-h-9 items-center gap-1.5 rounded-full bg-[#e8b27d] px-3.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] touch:min-h-11"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
            </svg>
            {tryLabel}
          </button>
          <button type="button" onClick={onMore} className="min-h-9 text-xs text-[#f3cfa8] underline-offset-2 hover:underline touch:min-h-11">
            {t.updates.bannerMore} →
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.updates.hideBanner}
        title={t.updates.hideBanner}
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#a79e94] transition hover:bg-white/10 hover:text-[#ede6dd] touch:h-11 touch:w-11"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}
