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

           FIX: khôi phục items-center + text-center trên mobile (đã bị
           mất trong bản trước đó) — H1 phía trên dùng text-center trên
           mobile, cột này trước kia bị hard-code text-left khiến trục
           căn giữa/trái bị gãy giữa H1 và About Me. Từ md trở lên vẫn
           căn trái như thiết kế gốc.
        */}
        <div className="flex flex-col items-center gap-6 py-6 pr-0 text-center md:items-start md:pr-12 md:text-left border-b md:border-b-0 md:border-r border-white/20">
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

           FIX: khôi phục items-center + text-center trên mobile, cùng lý
           do với cột trái.
        */}
        <div className="flex flex-col items-center justify-start gap-6 py-6 pl-0 text-center md:items-start md:pl-12 md:text-left">
          <p className="text-lg font-semibold text-white">
            Get in Touch
          </p>

          {/* FIX: thêm lại prop fullWidth — thiếu prop này khiến form
              email bị giới hạn max-w-[527.5px] gốc (dành cho lúc đứng
              một mình full-bleed), trong khi ở đây nó đã nằm trong 1
              cột của grid-cols-2 nên bị thu hẹp chồng thêm 1 lớp nữa,
              để lại khoảng trống lớn bên phải. */}
          <EmailCapture fullWidth />
        </div>

      </div>
    </div>
  );
};
