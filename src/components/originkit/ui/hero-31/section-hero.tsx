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

    {/* Rails — Các đường kẻ dọc mờ trang trí */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-full max-w-[1280px] -translate-x-1/2"
    >
      <span className="absolute inset-y-0 left-[16px] w-px bg-white/30 lg:left-[48px]" />
      <span className="absolute inset-y-0 right-[16px] w-px bg-white/30 lg:right-[48px]" />
    </div>

    {/* Navbar giữ nguyên trên cùng */}
    <div className="w-full max-w-[1280px] mx-auto px-0 z-50 shrink-0">
      <Navbar />
    </div>

    {/* KHỐI NỘI DUNG TẬP TRUNG: Đẩy toàn bộ nội dung chữ to và chữ nhỏ xuống nửa dưới màn hình */}
    <div className="w-full max-w-[1280px] mx-auto px-6 lg:px-12 z-10 flex flex-col justify-end flex-grow pb-12">
      
      {/* Tiêu đề chính: Hạ thấp khoảng cách mb xuống chỉ còn mb-8 để bám sát khối chữ bên dưới */}
      <h1 className="mb-8 font-sans text-[clamp(44px,7.5vw,80px)] lg:text-[100px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white antialiased">
        Your Front Desk,
        <br />
        Powered by AI
      </h1>

      {/* Gọi khối chân trang InfoBand nằm ngay dưới tiêu đề */}
      <InfoBand />
      
    </div>

    {/* Khoảng cách gap nhỏ cuối cùng dưới đáy màn hình */}
    <div
      aria-hidden
      className="h-[20px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
);
