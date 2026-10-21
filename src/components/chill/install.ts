'use client'

// Cài /chill thành ứng dụng "Lofi Pixel Cafe" (PWA — manifest ở app/chill/manifest.webmanifest,
// service worker ở public/chill-sw.js).
//
// - Chrome / Edge / Android: trình duyệt bắn `beforeinstallprompt` → giữ lại, nút "Cài quán lên
//   máy" trong Thực đơn gọi prompt()
// - iPhone / iPad (mọi trình duyệt đều là Safari bên trong) và Safari trên Mac: không có hộp
//   cài → nút mở hướng dẫn tay (Chia sẻ › Thêm vào MH chính / Tệp › Thêm vào Dock)
// - Đang mở trong ứng dụng đã cài, hoặc trình duyệt không cài được (Firefox): ẩn nút

import {useEffect, useState} from 'react'
import {trackEvent} from '@/lib/analytics'

type PromptEvent = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>}

export type InstallMode = 'prompt' | 'ios' | 'mac-safari' | null

// Sự kiện có thể tới trước khi ChillRoom gắn listener → giữ ở cấp module
let deferred: PromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as PromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    trackEvent({name: 'Chill Install', props: {action: 'installed'}})
    notify()
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone === true)

function manualMode(): InstallMode {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (ios) return 'ios'
  // Safari trên Mac (từ 17) có Tệp › Thêm vào Dock; Chrome/Edge trên Mac đi đường prompt
  if (ua.includes('Macintosh') && /Version\/1[7-9]|Version\/[2-9]\d/.test(ua) && ua.includes('Safari') && !/Chrome|Chromium|Edg|Firefox/.test(ua)) return 'mac-safari'
  return null
}

export function useInstall() {
  const [mode, setMode] = useState<InstallMode>(null)
  useEffect(() => {
    if (isStandalone()) return
    const update = () => setMode(deferred ? 'prompt' : manualMode())
    update()
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  const install = async () => {
    if (!deferred) return
    trackEvent({name: 'Chill Install', props: {action: 'open'}})
    const e = deferred
    await e.prompt()
    const {outcome} = await e.userChoice
    trackEvent({name: 'Chill Install', props: {action: outcome}})
    deferred = null
    notify()
  }
  return {mode, install}
}

// Đăng ký service worker (chỉ bản production — dev đổi file liên tục, cache sẽ làm rối) và
// đánh dấu lượt mở từ ứng dụng đã cài
export function useChillApp() {
  useEffect(() => {
    if (isStandalone()) trackEvent({name: 'Chill App Open'})
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/chill-sw.js', {scope: '/chill'}).catch(() => {
      // Trình duyệt chặn (chế độ riêng tư…) — quán vẫn chạy bình thường, chỉ không cài được offline
    })
  }, [])
}
