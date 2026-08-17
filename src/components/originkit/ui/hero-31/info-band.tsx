// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

import { EmailCapture } from "@/components/originkit/ui/hero-31/email-capture";

export const InfoBand = () => {
  return (
    <div className="w-full border-t border-b border-white/20 bg-transparent text-white antialiased">
      {/* 
         Padding dọc CHỈ khai báo ở mỗi cột (py-6 bên dưới) — bỏ py ở wrapper
         này để tránh cộng dồn 2 lớp padding, giữ nhịp spacing khớp với Hero.
      */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2">
        
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
            Get in Touch
          </p>

          {/* Form nhập liệu dùng chung EmailCapture — đúng width/gap theo
              breakpoint Figma (mobile/tablet/desktop) thay vì tự khai lại. */}
          <EmailCapture />
        </div>

      </div>
    </div>
  );
};
