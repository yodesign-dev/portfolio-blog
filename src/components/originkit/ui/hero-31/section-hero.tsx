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

    {/* Rails — Các đường kẻ dọc mờ trang trí chạy full chiều cao màn hình */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-full max-w-[1920px] -translate-x-1/2"
    >
      <span className="absolute inset-y-0 left-[16px] w-px bg-white/40 md:left-[48px]" />
      <span className="absolute inset-y-0 right-[16px] w-px bg-white/40 md:right-[48px]" />
    </div>

    {/* Khối Header điều hướng: Phải bọc trong div căn lề giống hệt sao cho khít lề kẻ dọc */}
    <div className="w-full max-w-[1920px] mx-auto px-[16px] md:px-[48px] z-50 shrink-0">
      <div className="px-[4px] md:px-[8px]">
        <Navbar />
      </div>
    </div>

    {/* KHỐI NỘI DUNG CHỮ LỚN: Tách riêng ra để đẩy sát xuống nửa dưới */}
    <div className="w-full max-w-[1920px] mx-auto px-[16px] md:px-[48px] z-10 flex flex-col justify-end flex-grow pb-8">
      <div className="px-[4px] md:px-[8px]">
        <h1 className="mb-0 font-sans text-[clamp(44px,7.5vw,80px)] lg:text-[100px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white antialiased">
          Your Front Desk,
          <br />
          Powered by AI
        </h1>
      </div>
    </div>

    {/* KHỐI CHÂN TRANG INFOBAND: Nằm độc lập bên ngoài để ăn viền kẻ ngang dài ra viền */}
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
