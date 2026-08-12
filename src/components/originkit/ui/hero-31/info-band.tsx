// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

export const InfoBand = () => {
  return (
    <div className="w-full border-t border-b border-white/20 bg-transparent text-white antialiased">
      {/* Loại bỏ các padding trùng lặp ngoài, chia 2 cột đối xứng tăm tắp */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2">
        
        {/* CỘT TRÁI: Đoạn văn mô tả tính năng */}
        <div className="flex flex-col gap-6 py-10 pr-0 md:pr-12 border-b md:border-b-0 md:border-r border-white/20 text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            Who We Are:
          </span>
          <p className="text-lg font-medium leading-relaxed max-w-md text-white/90">
            Custom AI voice agents that answer every call, schedule appointments, and support patients around the clock, without increasing headcount.
          </p>
        </div>

        {/* CỘT PHẢI: Tiêu đề phụ và Form Email màu Trắng */}
        <div className="flex flex-col justify-between gap-8 py-10 pl-0 md:pl-12 text-left">
          <p className="text-lg font-semibold text-white">
            Healthcare AI Receptionists
          </p>
          
          {/* Form nhập liệu: Ô input trắng tinh và nút xanh ngọc lam vuông vức chuẩn Concept */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <input
                type="email"
                placeholder="Your email address"
                className="w-full rounded-none border border-white/20 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none antialiased"
              />
            </div>
            <button
              type="submit"
              className="w-full shrink-0 rounded-none bg-[#50d3f2] px-6 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-[#3dbcdb] sm:w-auto"
            >
              Get In Touch
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
