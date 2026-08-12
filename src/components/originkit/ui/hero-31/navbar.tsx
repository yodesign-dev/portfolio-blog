// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

export const Navbar = () => {
  return (
    <header className="flex h-[80px] w-full items-center justify-between bg-white pl-[20px] md:pl-[56px] pr-0 text-[#1c1c1c] antialiased">
      {/* Khối Logo */}
      <div className="flex items-center">
        <span className="font-sans text-xl font-bold tracking-tight text-neutral-900">
          Voice AI
        </span>
      </div>

      {/* Khối các liên kết điều hướng */}
      <nav className="hidden md:flex items-center h-full">
        <div className="flex items-center gap-8 mr-12">
          <a href="#home" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition">
            Home
          </a>
          <a href="#pricing" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition">
            Pricing
          </a>
          <a href="#about" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition">
            About
          </a>
          <a href="#tools" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition">
            Tools
          </a>
        </div>
        
        {/* Nút bấm Get In Touch góc phải ăn tràn viền chuẩn Concept */}
        <button className="h-full px-10 font-sans text-sm font-bold bg-[#50d3f2] text-neutral-900 transition hover:bg-[#3dbcdb] flex items-center justify-center">
          Get In Touch
        </button>
      </nav>

      {/* Mobile Menu Trigger */}
      <div className="flex md:hidden pr-6">
        <button aria-label="Toggle Menu" className="p-2 text-neutral-700">
          <svg xmlns="http://w3.org" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};
