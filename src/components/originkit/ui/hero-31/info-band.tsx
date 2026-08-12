// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

export const InfoBand = () => {
  return (
    <div className="w-full border-t border-b border-white/20 bg-transparent py-10">
      {/* max-w-1920px kết hợp padding px y hệt h1 và navbar để dóng hàng dọc thẳng tắp */}
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-x-12 gap-y-8 px-[20px] md:grid-cols-2 md:px-[56px]">
        
        {/* ================= CỘT BÊN TRÁI ================= */}
        <div className="flex flex-col gap-3 text-left">
          <span className="text-sm font-bold uppercase tracking-wider text-white/60">
            Who We Are:
          </span>
          <p className="text-base font-medium leading-relaxed text-white max-w-md">
            Custom AI voice agents that answer every call, schedule appointments, and support patients around the clock, without increasing headcount.
          </p>
        </div>

        {/* ================= CỘT BÊN PHẢI ================= */}
        <div className="flex flex-col justify-end gap-3">
          <p className="text-sm font-bold uppercase tracking-wider text-white/60">
            Healthcare AI Receptionists
          </p>
          
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <input
                type="email"
                placeholder="Your email address"
                className="w-full rounded border border-white/20 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full shrink-0 rounded bg-[#50d3f2] px-6 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-[#3dbcdb] sm:w-auto"
            >
              Get In Touch
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
