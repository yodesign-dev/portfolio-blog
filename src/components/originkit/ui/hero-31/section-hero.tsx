// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";

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

    {/* Rails — Đường kẻ dọc trang trí */}
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
       Cố định padding-bottom và padding hai bên (px-[20px] md:px-[56px]) 
       để ép các khối dóng hàng dọc thẳng tắp, không bao giờ bị mất lề nữa.
    */}
    <div className={`${STAGE} px-[20px] md:px-[56px] z-10 flex flex-col justify-end h-[calc(100dvh-120px)] pb-12`}>
      
      {/* Tiêu đề chính h1 thanh mảnh, xích lại gần khối dưới bằng mb-16 */}
      <h1 className="mb-16 lg:mb-20 text-center md:text-left font-sans font-normal text-[clamp(44px,7.5vw,80px)] lg:text-[100px] leading-[1.05] tracking-[-0.04em] text-white antialiased" style={{ fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif', fontWeight: 300 }}>
        Learn by Sharing
        <br />
        Share by Learning
      </h1>

      {/* InfoBand chân trang đã được dọn sạch âm lề gây lỗi */}
      <div className="w-full">
        <InfoBand />
      </div>

    </div>

    {/* Khoảng trống đệm chân trang */}
    <div
      aria-hidden
      className="h-[20px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
);
