'use client'

import {useEffect, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'

// Khách mở /chill bằng trình duyệt gắn trong app (Facebook, Messenger, Zalo…): app tắt
// tiếng ngay khi khách chuyển sang việc khác, nên không nghe nền được. Mời khách mở bằng
// Safari / Chrome — Android mở thẳng Chrome qua intent, iOS 17+ qua x-safari-https,
// không được thì copy link. Đóng rồi thì thôi mời trong phiên đó.
// Thử trên máy tính: thêm ?inapp=facebook (hoặc zalo…) vào link

const DISMISS_KEY = 'chill:inapp-hint'

const APPS: [name: string, ua: RegExp][] = [
  ['Messenger', /Messenger|MessengerLite|FB_IAB\/Orca/i],
  ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS|FB4A/],
  ['Instagram', /Instagram/],
  ['Zalo', /Zalo/i],
  ['TikTok', /musical_ly|BytedanceWebview|TikTok/i],
  ['LINE', /\bLine\//],
]

function detectApp(): string | null {
  // Chỉ nhận tên app có trong danh sách: chữ lạ trên link không được hiện lên lời mời
  const forced = new URLSearchParams(window.location.search).get('inapp')?.toLowerCase()
  const known = forced && APPS.find(([name]) => name.toLowerCase() === forced)?.[0]
  if (known) return known
  const ua = navigator.userAgent
  return APPS.find(([, re]) => re.test(ua))?.[0] ?? null
}

// Link mở bằng trình duyệt ngoài — bỏ ?inapp= để khỏi hiện lại lời mời ở đó
function externalUrl(android: boolean) {
  const url = new URL(window.location.href)
  url.searchParams.delete('inapp')
  if (android) {
    const fallback = encodeURIComponent(url.href)
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
  }
  return `x-safari-${url.href}`
}

export function InAppHint() {
  const t = useT()
  const [app, setApp] = useState<string | null>(null)
  const [android, setAndroid] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      // Chặn storage → vẫn mời
    }
    const found = detectApp()
    if (!found || dismissed) return
    /* eslint-disable react-hooks/set-state-in-effect -- đọc userAgent sau khi hydrate */
    setApp(found)
    setAndroid(/Android/i.test(navigator.userAgent))
    /* eslint-enable react-hooks/set-state-in-effect */
    trackEvent({name: 'Chill InApp', props: {action: 'view', app: found}})
  }, [])

  if (!app) return null

  const close = () => {
    trackEvent({name: 'Chill InApp', props: {action: 'dismiss', app}})
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Chặn storage → chỉ ẩn lần này
    }
    setApp(null)
  }

  const copy = () => {
    trackEvent({name: 'Chill InApp', props: {action: 'copy', app}})
    const url = new URL(window.location.href)
    url.searchParams.delete('inapp')
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
    // Nhiều trình duyệt trong app không có hoặc chặn navigator.clipboard → chép qua ô chữ ẩn
    const legacy = () => {
      const el = document.createElement('textarea')
      el.value = url.href
      el.readOnly = true
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      el.setSelectionRange(0, url.href.length)
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch {
        // Không chép được → dòng hướng dẫn bấm ⋯ bên dưới vẫn còn đó
      }
      el.remove()
      if (ok) done()
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url.href).then(done, legacy)
    else legacy()
  }

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-16 z-[60] mx-auto max-w-sm rounded-2xl border border-[#e8b27d]/30 bg-[#16131a]/95 p-4 text-left text-[#ede6dd] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md sm:top-20"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t.inApp.title(app)}</p>
          <p className="mt-1 text-pretty text-xs leading-relaxed text-[#cfc6bb]">{t.inApp.body}</p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t.inApp.close}
          className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#a79e94] transition hover:bg-white/10 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={externalUrl(android)}
          onClick={() => trackEvent({name: 'Chill InApp', props: {action: 'open', app}})}
          className="flex min-h-10 items-center rounded-full bg-[#e8b27d] px-4 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
        >
          {android ? t.inApp.openChrome : t.inApp.openSafari}
        </a>
        <button
          type="button"
          onClick={copy}
          className="flex min-h-10 items-center rounded-full border border-white/15 px-4 text-sm text-[#ede6dd] transition hover:bg-white/10"
        >
          {copied ? t.inApp.copied : t.inApp.copy}
        </button>
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-[#a79e94]">{t.inApp.manual}</p>
    </div>
  )
}
