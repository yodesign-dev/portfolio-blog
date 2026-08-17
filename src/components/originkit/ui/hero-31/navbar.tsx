// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React, { useState } from "react";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#blogs", label: "Blogs" },
    { href: "#resume", label: "Resume" },
    { href: "#tools", label: "Tools" },
  ];

  return (
    <header className="relative flex h-[80px] w-full items-center justify-between bg-white pl-[20px] md:pl-[56px] pr-0 text-[#1c1c1c] antialiased">
      {/* Khối Logo */}
      <div className="flex items-center">
        <span className="font-sans text-xl font-bold tracking-tight text-neutral-900">
          YoBlogs
        </span>
      </div>

      {/* Khối các liên kết điều hướng */}
      <nav className="hidden md:flex items-center h-full">
        <div className="flex items-center gap-8 mr-12">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition"
            >
              {link.label}
            </a>
          ))}
        </div>
        
        {/* Nút bấm Get In Touch góc phải ăn tràn viền chuẩn Concept */}
        <button className="h-full px-10 font-sans text-sm font-bold bg-[#50d3f2] text-neutral-900 transition hover:bg-[#3dbcdb] flex items-center justify-center">
          Get In Touch
        </button>
      </nav>

      {/* Mobile Menu Trigger */}
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

      {/* Mobile Sub-menu Panel */}
      <div
        className={`absolute left-0 right-0 top-[80px] z-40 w-full origin-top overflow-hidden bg-white shadow-lg transition-all duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col px-[20px] py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="border-b border-neutral-100 py-4 text-base font-semibold text-neutral-700 transition hover:text-neutral-900"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="mt-4 w-full bg-[#50d3f2] px-6 py-4 font-sans text-sm font-bold text-neutral-900 transition hover:bg-[#3dbcdb]"
          >
            Get In Touch
          </button>
        </nav>
      </div>
    </header>
  );
};
