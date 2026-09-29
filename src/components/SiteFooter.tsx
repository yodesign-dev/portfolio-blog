'use client'

import Link from 'next/link'
import {useContactModal} from '@/components/originkit/ui/hero-31/contact-modal-context'
import {NAV_LINKS, SITE_NAME, SITE_ROLE, SOCIAL_LINKS} from '@/lib/site'

export function SiteFooter({showResume}: {showResume: boolean}) {
  const {openModal} = useContactModal()
  const navLinks = NAV_LINKS.filter((link) => showResume || link.href !== '/resume')
  const socialLinks = SOCIAL_LINKS.filter((link) => link.href)

  return (
    <footer className="mt-auto bg-[#0b1432] text-white antialiased">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="text-xl font-bold tracking-tight">{SITE_NAME}</p>
          <p className="mt-1 text-sm text-white/60">{SITE_ROLE}</p>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/80">
            Have a project, a role, or a question? I&apos;d love to hear about it.
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="mt-6 flex min-h-12 cursor-pointer items-center justify-center bg-[#50d3f2] px-6 text-sm font-bold text-neutral-900 transition hover:bg-[#3dbcdb]"
          >
            Get In Touch
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
        <p className="mx-auto max-w-6xl px-6 py-6 text-sm text-white/50 sm:px-8">
          © {new Date().getFullYear()} {SITE_NAME}. Learn by sharing, share by learning.
        </p>
      </div>
    </footer>
  )
}
