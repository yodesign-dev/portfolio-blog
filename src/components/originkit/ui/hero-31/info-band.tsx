// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

export const InfoBand = () => {
  return (
    <div className="w-full border-t border-b border-white/20 bg-transparent text-white antialiased">
      {/* 
         Cố định khoảng đệm trên/dưới py-4 cho dải băng chính 
      */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 py-4 lg:py-6">
        
        {/* 
           CỘT TRÁI: Thêm py-6 tạo khoảng đệm dọc ở trên và dưới 
           giúp chữ không bị dính sát lề đáy như ô màu cam bạn vẽ.
        */}
        <div className="flex flex-col gap-6 py-6 pr-0 md:pr-12 border-b md:border-b-0 md:border-r border-white/20 text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
           About Me
          </span>
          <p className="text-lg font-medium leading-relaxed max-w-md text-white/90">
            10+ years designing end-to-end product experiences, grounded in user research and UI/UX thinking. This past year, Bin's been using AI to move faster from research to high-fidelity work.
          </p>
        </div>

        {/* 
           CỘT PHẢI: Sử dụng py-6 đồng bộ tạo khoảng đệm dọc.
           Thay thế 'justify-between' bằng 'justify-start' để kéo form nhập 
           xích lên trên, nằm gọn gàng bên trong hộp kẻ ngang.
        */}
        <div className="flex flex-col justify-start gap-6 py-6 pl-0 md:pl-12 text-left">
          <p className="text-lg font-semibold text-white">
            Healthcare AI Receptionists
          </p>
          
          {/* Form nhập liệu: Ô input trắng và nút xanh nằm gọn gàng */}
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
