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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[567px] [--fade-solid:266px] md:h-[629px] md:[--fade-solid:264px] lg:h-[416px] lg:[--fade-solid:116px]"
    />

    {/* Rails — Đường kẻ lưới dọc trang trí chạy full-viewport */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-full"
    >
      <span className="absolute inset-y-0 left-[20px] w-px bg-white/15 md:left-[56px]" />
      <span className="absolute inset-y-0 right-[20px] w-px bg-white/15 md:right-[56px]" />
    </div>

    {/* Thống nhất Navbar ôm sát viền lưới */}
    <div className="w-full z-50 shrink-0">
      <Navbar />
    </div>

    {/* Khối chữ lớn tiêu đề: Sử dụng font dầy đậm đặc trưng của concept */}
    <div className="w-full z-10 flex flex-col justify-end flex-grow pb-12 pl-[20px] md:pl-[56px] pr-[20px] md:pr-[56px] mt-16">
        <h1 className="mb-0 font-sans font-normal text-[clamp(44px,7.5vw,80px)] lg:text-[100px] leading-[1.05] tracking-[-0.04em] text-white antialiased" style={{ fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif', fontWeight: 300 }}>
        Your Front Desk,
        <br />
        Powered by AI
      </h1>
    </div>

    {/* Cụm InfoBand chân trang */}
    <div className="w-full z-20 shrink-0">
      <InfoBand />
    </div>

    {/* Khoảng đệm đáy kết thúc layout */}
    <div
      aria-hidden
      className="h-[40px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
);
