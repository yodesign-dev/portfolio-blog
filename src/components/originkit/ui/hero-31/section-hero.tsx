// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";

const FADE_FILL =
  "linear-gradient(to top, #002fff 0, #002fff var(--fade-solid), transparent 100%)";

export const SectionHero = () => (
  <main className="animate-hero-reveal relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-[#002fff] pt-20">
    <WaveField />

    <div
      aria-hidden
      style={{ backgroundImage: FADE_FILL }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[567px] [--fade-solid:266px] md:h-[629px] md:[--fade-solid:264px] lg:h-[416px] lg:[--fade-solid:116px]"
    />

    {/* Rails — Các đường kẻ dọc mờ trang trí chạy full chiều cao màn hình */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-full max-w-[1920px] -translate-x-1/2"
    >
      <span className="absolute inset-y-0 left-[16px] w-px bg-white/30 md:left-[48px]" />
      <span className="absolute inset-y-0 right-[16px] w-px bg-white/30 md:right-[48px]" />
    </div>

    {/* Gọi Navbar chạy tràn viền độc lập */}
    <Navbar />

    {/* KHỐI NỘI DUNG CHỮ LỚN: Tăng font-weight lên mức tối đa font-[900] */}
    <div className="w-full max-w-[1920px] mx-auto px-[20px] md:px-[56px] z-10 flex flex-col justify-end flex-grow pb-8 mt-12">
      <h1 className="mb-0 font-sans text-[clamp(44px,7.5vw,80px)] lg:text-[100px] font-[900] leading-[1.02] tracking-[-0.05em] text-white antialiased">
        Your Front Desk,
        <br />
        Powered by AI
      </h1>
    </div>

    {/* KHỐI CHÂN TRANG INFOBAND */}
    <div className="w-full z-20 shrink-0">
      <InfoBand />
    </div>

    {/* Khoảng cách trống dưới chân trang */}
    <div
      aria-hidden
      className="h-[20px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
);
