'use client'

// Turnstile chạy ngầm cho các thao tác không có form riêng (mời cà phê, báo cáo mẩu nhật ký) —
// API bắt buộc token để bot không bắn được mail / không ẩn được mẩu của người khác. Chế độ
// execution: "execute": chỉ xác minh lúc gọi getToken() → token luôn mới dù khách để tab cả
// chục phút (token hết hạn sau 5 phút). Khung chỉ hiện khi Cloudflare cần khách bấm.
// `enabled` = false thì chưa tải script (vd Nhật ký chưa mở) — getToken() trả null.

import Script from 'next/script'
import {useEffect, useRef, useState} from 'react'

export type GetToken = () => Promise<string | null>

export function useTurnstile({enabled = true, theme = 'dark', className = 'shrink-0 px-5'}: {enabled?: boolean; theme?: 'light' | 'dark'; className?: string} = {}) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)
  const waiter = useRef<((token: string | null) => void) | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    // Script có thể đã tải sẵn (sổ góp ý, Nhật ký, form Contact) → dùng luôn
    if (enabled && window.turnstile) setScriptReady(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [enabled])

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!enabled || !scriptReady || !box.current || !window.turnstile || !sitekey) return
    const settle = (token: string | null) => waiter.current?.(token)
    widget.current = window.turnstile.render(box.current, {
      sitekey,
      execution: 'execute',
      appearance: 'interaction-only',
      size: 'flexible',
      theme,
      callback: (token: string) => settle(token),
      'error-callback': () => settle(null),
      'timeout-callback': () => settle(null),
    })
    return () => {
      settle(null)
      if (window.turnstile && widget.current) window.turnstile.remove(widget.current)
      widget.current = undefined
    }
  }, [enabled, scriptReady, theme])

  const getToken: GetToken = () =>
    new Promise((resolve) => {
      const ts = window.turnstile
      if (!ts || !widget.current || !box.current) return resolve(null)
      // Lần gọi trước còn chờ → cho nó trả null
      waiter.current?.(null)
      // finish chỉ được gọi sau khi `timer` đã gán (qua hẹn giờ hoặc callback của Turnstile)
      const finish = (token: string | null) => {
        clearTimeout(timer)
        if (waiter.current === finish) waiter.current = null
        resolve(token)
      }
      // Cloudflare im quá lâu → thôi, không bắt khách chờ mãi
      const timer = setTimeout(() => finish(null), 30_000)
      waiter.current = finish
      // Mỗi token chỉ dùng được 1 lần → reset rồi xác minh lại
      ts.reset(widget.current)
      ts.execute(box.current)
    })

  const node = (
    <>
      {enabled && !scriptReady && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />}
      <div ref={box} className={className} />
    </>
  )
  return {getToken, node}
}
