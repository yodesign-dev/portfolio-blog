// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

export const Navbar = () => {
  return (
    <header className="w-full bg-white text-neutral-900 border-b border-neutral-200 rounded-b-md shadow-sm">
      {/* Container co giãn tự do bám sát theo lề bọc bên ngoài */}
      <div className="flex h-20 w-full items-center justify-between px-6">
        
        {/* LOGO bên trái */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-neutral-900">
            Voice AI
          </span>
        </div>

        {/* MENU ĐIỀU HƯỚNG BÊN PHẢI */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition">
            Home
          </a>
          <a href="#pricing" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition">
            Pricing
          </a>
          <a href="#about" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition">
            About
          </a>
          <a href="#tools" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition">
            Tools
          </a>
          <button className="rounded bg-[#002fff] px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-blue-700">
            Get In Touch
          </button>
        </nav>

        {/* MOBILE HAMBURGER */}
        <div className="flex md:hidden">
          <button aria-label="Toggle Menu" className="p-2 text-neutral-700">
            <svg xmlns="http://w3.org" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
};
