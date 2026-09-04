// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useContactModal } from "./contact-modal-context";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openModal } = useContactModal();
  // MỚI: dùng usePathname để biết đang ở trang nào, làm nổi bật đúng
  // mục trong menu — trước đây không có chỉ báo gì, người dùng khó biết
  // mình đang xem trang nào.
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blogs" },
    { href: "/resume", label: "Resume" },
    { href: "/tools", label: "Tools" },
  ];

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
    <header className="relative flex h-[80px] w-full items-center justify-between bg-white pl-[20px] md:pl-[56px] pr-0 text-[#1c1c1c] antialiased">
      <div className="flex items-center">
        <span className="font-sans text-xl font-bold tracking-tight text-neutral-900">
          YoBlogs
        </span>
      </div>

      <nav className="hidden md:flex items-center h-full">
        <div className="flex items-center gap-8 mr-12">
          {navLinks.map((link) =>
            renderLink(
              link,
              "text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition",
              "text-neutral-900 underline underline-offset-4 decoration-2 decoration-[#00ddff]"
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="h-full px-10 font-sans text-sm font-bold bg-[#50d3f2] text-neutral-900 transition hover:bg-[#3dbcdb] flex items-center justify-center"
        >
          Get In Touch
        </button>
      </nav>

      <div className="flex md:hidden pr-6">
        <button
          aria-label="Toggle Menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="p-2 text-neutral-700"
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
        className={`fixed left-0 right-0 top-[80px] z-40 h-[calc(100dvh-80px)] w-full overflow-y-auto bg-white shadow-lg transition-opacity duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <nav className="flex flex-col px-[20px] py-4">
          {navLinks.map((link) =>
            renderLink(
              link,
              "border-b border-neutral-100 py-4 text-base font-semibold text-neutral-700 transition hover:text-neutral-900",
              "text-neutral-900 bg-neutral-50",
              () => setIsMenuOpen(false)
            )
          )}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              openModal();
            }}
            className="mt-4 w-full bg-[#50d3f2] px-6 py-4 font-sans text-sm font-bold text-neutral-900 transition hover:bg-[#3dbcdb]"
          >
            Get In Touch
          </button>
        </nav>
      </div>
    </header>
  );
};
