// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useContactModal } from "./contact-modal-context";
import { NAV_LINKS, SITE_NAME } from "@/lib/site";

export const Navbar = ({ showResume }: { showResume: boolean }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openModal } = useContactModal();
  const pathname = usePathname();

  const navLinks = NAV_LINKS.filter((link) => showResume || link.href !== "/resume");

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // MỚI: "/" chỉ active khi đúng trang chủ (không phải mọi path đều
  // bắt đầu bằng "/"); các trang khác active khi pathname bắt đầu bằng
  // href đó (để /blog/[slug] vẫn làm nổi bật mục "Blogs").
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const renderLink = (
    link: { href: string; label: string },
    baseClassName: string,
    activeClassName: string,
    onClick?: () => void
  ) => (
    <Link
      key={link.href}
      href={link.href}
      onClick={onClick}
      aria-current={isActive(link.href) ? "page" : undefined}
      className={isActive(link.href) ? `${baseClassName} ${activeClassName}` : baseClassName}
    >
      {link.label}
    </Link>
  );

  return (
    <header className="relative flex h-[80px] w-full items-center justify-between border-b-2 border-neutral-900 bg-white pl-[20px] md:pl-[56px] pr-0 text-neutral-900 antialiased">
      <div className="flex items-center">
        <Link
          href="/"
          className="font-sans text-xl font-bold tracking-tight text-neutral-900 transition hover:text-neutral-600"
        >
          {SITE_NAME}
        </Link>
      </div>

      <nav className="hidden md:flex items-center h-full">
        {/* Chữ mono in hoa rộng hơn chữ thường: ở md (768–1023px) thu khoảng cách để 5 mục
            (khi có Resume) vẫn vừa một hàng */}
        <div className="mr-6 flex items-center gap-5 lg:mr-12 lg:gap-8">
          {navLinks.map((link) =>
            renderLink(
              link,
              "font-mono text-xs uppercase tracking-[0.08em] text-neutral-600 hover:text-neutral-900 transition",
              "text-neutral-900 underline underline-offset-4 decoration-2 decoration-brand"
            )
          )}
        </div>

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => openModal(undefined, "nav")}
          className="flex h-full items-center justify-center border-l-2 border-neutral-900 bg-accent px-6 lg:px-10 font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-ink transition hover:bg-accent-hover"
        >
          Get in touch
        </button>
      </nav>

      {/* Nút 44×44 (trước là 40×40). pr-[22px] thay pr-6 để icon vẫn nằm đúng chỗ cũ */}
      <div className="flex md:hidden pr-[22px]">
        <button
          aria-label="Toggle Menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex size-11 items-center justify-center text-neutral-700"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`fixed left-0 right-0 top-[80px] z-40 h-[calc(100dvh-80px)] w-full overflow-y-auto border-t-2 border-neutral-900 bg-white transition-opacity duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <nav className="flex flex-col px-[20px] py-4">
          {navLinks.map((link) =>
            renderLink(
              link,
              "border-b border-neutral-200 py-4 font-mono text-sm uppercase tracking-[0.08em] text-neutral-700 transition hover:text-neutral-900",
              "text-neutral-900 bg-neutral-50",
              () => setIsMenuOpen(false)
            )
          )}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              setIsMenuOpen(false);
              openModal(undefined, "nav_mobile");
            }}
            className="btn-hard mt-4 w-full bg-accent px-6 py-4 text-ink hover:bg-accent-hover"
          >
            Get in touch
          </button>
        </nav>
      </div>
    </header>
  );
};
