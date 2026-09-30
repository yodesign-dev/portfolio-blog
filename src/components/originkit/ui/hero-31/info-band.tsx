// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import React from "react";

// Những việc Bin làm — cụ thể hoá câu About bên trái
const FOCUS = ["User research", "UX & UI design", "Hi-fi prototyping", "AI workflows"];

export const InfoBand = () => {
  return (
    <div className="w-full border-t border-b border-white/20 bg-transparent text-white antialiased">
      {/*
         Padding dọc CHỈ khai báo ở mỗi cột (py-6 bên dưới) — bỏ py ở wrapper
         này để tránh cộng dồn 2 lớp padding, giữ nhịp spacing khớp với Hero.
      */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2">

        {/*
           CỘT TRÁI: About. Mobile căn giữa cho cùng trục với H1, từ md trở
           lên căn trái như thiết kế gốc.
        */}
        <div className="flex flex-col items-center gap-6 py-6 pr-0 text-center md:items-start md:pr-12 md:text-left border-b md:border-b-0 md:border-r border-white/20">
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
           About Me
          </span>
          <p className="text-lg font-medium leading-relaxed max-w-md text-white/90">
            10+ years designing end-to-end product experiences, grounded in user research and UI/UX thinking. This past year, I&apos;ve been using AI to move faster from research to high-fidelity work.
          </p>
        </div>

        {/*
           CỘT PHẢI: trước đây là form email "Let's talk" — xin email ngay
           màn đầu khi người xem chưa thấy sản phẩm nào. Liên hệ đã có ở nút
           hero, nav và footer (cùng mở ContactModal), nên chỗ này dành để
           nói rõ Bin làm gì.
        */}
        <div className="flex flex-col items-center justify-start gap-6 py-6 pl-0 text-center md:items-start md:pl-12 md:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            What I Do
          </span>
          <ul className="flex max-w-md flex-wrap justify-center gap-2 md:justify-start">
            {FOCUS.map((item) => (
              <li
                key={item}
                className="border border-white/30 px-3 py-1.5 text-sm font-medium text-white/90"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
};
