// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

export const InfoBand = () => {
  return (
    <div className="w-full border-t border-b border-white/20 bg-transparent py-6">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-12">
        
        {/* Khối chữ giới thiệu bên trái */}
        <div className="flex flex-col gap-2 md:max-w-md">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            Who We Are:
          </span>
          <p className="text-sm font-medium text-white/90">
            Healthcare AI Receptionists
          </p>
        </div>

        {/* Khối Form Email + Nút bấm Get In Touch bên phải */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:max-w-md md:justify-end">
          <div className="relative w-full">
            <input
              type="email"
              placeholder="Your email address"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/50 outline-none backdrop-blur-sm transition focus:border-white/40 focus:bg-white/20"
            />
          </div>
          <button
            type="submit"
            className="w-full shrink-0 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#002fff] shadow-lg transition hover:bg-white/90 active:scale-[0.98] sm:w-auto"
          >
            Get In Touch
          </button>
        </div>

      </div>
    </div>
  );
};
