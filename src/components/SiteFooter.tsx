'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {getCalApi} from '@calcom/embed-react'
import {useContactModal} from '@/components/originkit/ui/hero-31/contact-modal-context'
import {CONTACT_EMAIL, LINKEDIN_URL, NAV_LINKS, SIDE_PROJECT_LINKS, SITE_NAME, SITE_ROLE, SOCIAL_LINKS} from '@/lib/site'
import {trackEvent} from '@/lib/analytics'

export function SiteFooter({showResume}: {showResume: boolean}) {
  const {openModal} = useContactModal()
  const navLinks = NAV_LINKS.filter((link) => showResume || link.href !== '/resume')
  const socialLinks = SOCIAL_LINKS.filter((link) => link.href)

  return (
    <footer className="mt-auto bg-ink text-white antialiased">
      <ContactBlock showResume={showResume} onMessage={() => openModal(undefined, 'footer')} />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-3 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="sm:col-span-3 md:col-span-1">
          <p className="text-xl font-bold tracking-tight">{SITE_NAME}</p>
          <p className="mt-1 text-sm text-white/60">{SITE_ROLE}</p>
        </div>

        <nav aria-label="Footer">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Explore</p>
          <ul className="mt-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/80 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Side projects</p>
          <ul className="mt-4 flex flex-col gap-3">
            {SIDE_PROJECT_LINKS.map((link) => (
              <li key={link.label}>
                {link.external ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-white/80 transition hover:text-white">
                    {link.label} ↗
                  </a>
                ) : (
                  <Link href={link.href} className="text-white/80 transition hover:text-white">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {socialLinks.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Elsewhere</p>
            <ul className="mt-4 flex flex-col gap-3">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent({name: 'Social Click', props: {network: link.label}})}
                    className="text-white/80 transition hover:text-white"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-6 text-sm text-white/50 sm:px-8">
          <p>© {new Date().getFullYear()} {SITE_NAME}. Learn by sharing, share by learning.</p>
          {/* Điều khoản & quyền riêng tư hiện chỉ áp dụng cho quán /chill */}
          <p className="flex gap-4">
            <Link href="/chill/terms" className="transition hover:text-white">
              /chill terms
            </Link>
            <Link href="/chill/privacy" className="transition hover:text-white">
              /chill privacy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

// Khối liên hệ cuối mọi trang: đủ các cách trong một chỗ. Cal.com chỉ tải khi khối sắp
// vào màn hình. Email hiện chữ + nút chép vì link mailto không mở được với người dùng webmail.
function ContactBlock({showResume, onMessage}: {showResume: boolean; onMessage: () => void}) {
  const blockRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        void getCalApi().then((cal) =>
          cal('ui', {theme: 'light', styles: {branding: {brandColor: '#00ddff'}}, hideEventTypeDetails: false, layout: 'month_view'}),
        )
      },
      {rootMargin: '300px'},
    )
    observer.observe(blockRef.current!)
    return () => observer.disconnect()
  }, [])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Trình duyệt chặn clipboard: địa chỉ vẫn hiện để chọn tay
    }
  }

  const rowClass = 'flex min-h-14 items-center justify-between gap-4 border-b border-white/15 last:border-b-0'
  return (
    <section ref={blockRef} aria-labelledby="contact-title" className="border-b border-white/10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 sm:px-8 md:grid-cols-2 md:gap-16 md:py-20">
        <div>
          <h2 id="contact-title" className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Have a project or a role in mind?
          </h2>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button
              type="button"
              data-cal-link="yoshark-bin/30min"
              data-cal-config='{"layout":"month_view"}'
              onClick={() => trackEvent({name: 'Book Call Click'})}
              className="flex min-h-12 cursor-pointer items-center justify-center bg-accent px-6 text-sm font-bold text-ink transition hover:bg-accent-hover"
            >
              Book a 30-min call
            </button>
            <button
              type="button"
              onClick={onMessage}
              className="min-h-11 cursor-pointer text-sm font-semibold text-white/80 underline decoration-white/30 underline-offset-4 transition hover:text-white"
            >
              Or send a message
            </button>
          </div>
        </div>
        <ul>
          <li className={rowClass}>
            <a href={`mailto:${CONTACT_EMAIL}`} className="min-w-0 py-3 [overflow-wrap:anywhere] transition hover:text-accent">
              {CONTACT_EMAIL}
            </a>
            <button type="button" onClick={copyEmail} className="min-h-11 min-w-11 shrink-0 cursor-pointer text-sm font-semibold text-accent transition hover:text-accent-hover">
              <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </li>
          <li className={rowClass}>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({name: 'Social Click', props: {network: 'LinkedIn'}})}
              className="flex flex-1 items-center justify-between py-3 transition hover:text-accent"
            >
              LinkedIn <span aria-hidden>↗</span>
            </a>
          </li>
          {showResume && (
            <li className={rowClass}>
              <Link href="/resume" className="flex flex-1 items-center justify-between py-3 transition hover:text-accent">
                Resume <span aria-hidden>→</span>
              </Link>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
