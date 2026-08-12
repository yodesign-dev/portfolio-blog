// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";

/**
 * Đã chuẩn hóa các class Responsive custom (ipad -> md, desktop-sm -> lg) 
 * để tương thích hoàn toàn với Tailwind CSS v4 của bạn.
 */
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

    {/* Rails — Đường kẻ viền mờ cân đối ở giữa màn hình lớn */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-full max-w-[1280px] -translate-x-1/2"
    >
      <span className="absolute inset-y-0 left-[16px] w-px bg-white/40 md:left-[48px]" />
      <span className="absolute inset-y-0 right-[16px] w-px bg-white/40 md:right-[48px]" />
    </div>

    {/* Navbar trong suốt và ôm gọn theo khung chuẩn */}
    <div className="w-full max-w-[1280px] mx-auto px-0 z-50">
      <Navbar />
    </div>

    {/* Khối nội dung Tiêu đề chính được gom vào giữa màn hình */}
    <div
      className={`${STAGE} z-10 flex flex-col justify-end min-h-[449px] md:min-h-[470px] lg:min-h-[429px] px-[20px] md:px-[56px] w-full max-w-[1280px] mx-auto`}
    >
      <h1 className="mb-[40px] font-sans text-[clamp(36px,12vw,48px)] leading-[1.1] tracking-[-0.06em] text-white md:mb-[56px] md:text-[80px] lg:text-[100px]">
        Your Front Desk,
        <br />
        Powered by AI
      </h1>
    </div>

    {/* Form nhập Email và thông tin được gom gọn căn lề chuẩn */}
    <div className="w-full max-w-[1280px] mx-auto px-0 z-20">
      <InfoBand />
    </div>

    {/* Khoảng cách gap chân trang */}
    <div
      aria-hidden
      className="h-[40px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
);
