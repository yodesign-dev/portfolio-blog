'use client'

import Link from 'next/link'
import {useContactModal} from '@/components/originkit/ui/hero-31/contact-modal-context'
import {NAV_LINKS, SIDE_PROJECT_LINKS, SITE_NAME, SITE_ROLE, SOCIAL_LINKS} from '@/lib/site'
import {trackEvent} from '@/lib/analytics'

export function SiteFooter({showResume}: {showResume: boolean}) {
  const {openModal} = useContactModal()
  const navLinks = NAV_LINKS.filter((link) => showResume || link.href !== '/resume')
  const socialLinks = SOCIAL_LINKS.filter((link) => link.href)

  return (
    <footer className="mt-auto bg-ink text-white antialiased">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-3 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="sm:col-span-3 md:col-span-1">
          <p className="text-xl font-bold tracking-tight">{SITE_NAME}</p>
          <p className="mt-1 text-sm text-white/60">{SITE_ROLE}</p>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/80">
            Have a project, a role, or a question? I&apos;d love to hear about it.
          </p>
          <button
            type="button"
            onClick={() => openModal(undefined, 'footer')}
            className="mt-6 flex min-h-12 cursor-pointer items-center justify-center bg-accent px-6 text-sm font-bold text-ink transition hover:bg-accent-hover"
          >
            Get in touch
          </button>
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
