'use client'

// Nút "Share" trên thanh trên cùng trang /chill, cạnh "What's new".
// Điện thoại (có navigator.share) → menu chia sẻ của máy. Còn lại → popup nhỏ:
// copy link, Facebook, Reddit, X.

import {useEffect, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'

const TITLE = 'Chill for work — a pixel café by a window in Vietnam, with lo-fi music'

export function ShareButton() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const url = () => `${window.location.origin}/chill`

  const onClick = async () => {
    const touch = window.matchMedia('(pointer: coarse)').matches
    if (touch && navigator.share) {
      try {
        await navigator.share({title: TITLE, url: url()})
        trackEvent({name: 'Share', props: {platform: 'native'}})
      } catch {
        // Người dùng đóng menu chia sẻ
      }
      return
    }
    setOpen((o) => !o)
  }

  const copy = () => {
    void navigator.clipboard?.writeText(url()).then(() => {
      setCopied(true)
      trackEvent({name: 'Share', props: {platform: 'copy'}})
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const links = () => {
    const u = encodeURIComponent(url())
    const t = encodeURIComponent(TITLE)
    return [
      {id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`},
      {id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}`},
      {id: 'x', label: 'X', href: `https://x.com/intent/post?url=${u}&text=${t}`},
    ]
  }

  const item =
    'flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[#ede6dd] transition hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[#e8b27d]'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label="Share"
        aria-expanded={open}
        title="Share"
        className="flex h-9 items-center gap-1.5 rounded-md bg-black/45 px-2.5 text-xs text-white/90 backdrop-blur transition hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 10V2M8 2L5 5M8 2l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 8.5V13a1 1 0 001 1h8a1 1 0 001-1V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#1b1a21]/95 p-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <button type="button" onClick={copy} className={item}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
          {links().map((l) => (
            <a
              key={l.id}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent({name: 'Share', props: {platform: l.id}})
                setOpen(false)
              }}
              className={item}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
