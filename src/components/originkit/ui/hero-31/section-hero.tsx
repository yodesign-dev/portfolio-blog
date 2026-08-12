// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";

const FADE_FILL =
  "linear-gradient(to top, #002fff 0, #002fff var(--fade-solid), transparent 100%)";

export const SectionHero = () => (
  <main className="animate-hero-reveal relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-[#002fff]">
    <WaveField />

    <div
      aria-hidden
      style={{ backgroundImage: FADE_FILL }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z- h-[567px] [--fade-solid:266px] md:h-[629px] md:[--fade-solid:264px] lg:h-[416px] lg:[--fade-solid:116px]"
    />

    {/* Rails — Các đường kẻ dọc mờ trang trí chạy full chiều cao màn hình */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z- w-full"
    >
      <span className="absolute inset-y-0 left-[20px] w-px bg-white/15 md:left-[56px]" />
      <span className="absolute inset-y-0 right-[20px] w-px bg-white/15 md:right-[56px]" />
    </div>

    {/* 1. KHỐI NAVBAR TRÊN CÙNG */}
    <div className="w-full z-50 shrink-0">
      <Navbar />
    </div>

    {/* 
       2. KHỐI TRUNG TÂM TOÀN BỘ NỘI DUNG: 
       Sử dụng h-[calc(100dvh-80px)] trừ đi chiều cao navbar để tính toán không gian,
       loại bỏ hoàn toàn 'flex-grow' bậy bạ. Sử dụng padding-bottom chính xác để kiểm soát 
       khoảng cách bám sát giữa Tiêu đề h1 và InfoBand.
    */}
    <div className="w-full max-w-[1920px] mx-auto px-[20px] md:px-[56px] z-10 flex flex-col justify-end h-[calc(100dvh-120px)] pb-6 lg:pb-12">
      
      {/* 
         Tiêu đề h1: Đã được ghim cứng khoảng cách đáy bằng mb-16 (hoặc mb-20) 
         giúp nó bám sát, ôm khít gọn gàng ngay phía trên khối text mô tả của InfoBand 
         theo đúng tỷ lệ của bản Concept.
      */}
      <h1 className="mb-14 lg:mb-20 font-sans font-normal text-[clamp(44px,7.5vw,80px)] lg:text-[100px] leading-[1.05] tracking-[-0.04em] text-white antialiased" style={{ fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif', fontWeight: 300 }}>
        Your Front Desk,
        <br />
        Powered by AI
      </h1>

      {/* Đưa InfoBand trực tiếp vào đây để dính liền theo khối trục dọc với h1 */}
      <div className="w-full -mx-[20px] md:-mx-[56px] min-w-[calc(100%+40px)] md:min-w-[calc(100%+112px)]">
        <InfoBand />
      </div>

    </div>

    {/* Khoảng trống đệm cố định chân trang kết thúc layout */}
    <div
      aria-hidden
      className="h-[20px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
);
