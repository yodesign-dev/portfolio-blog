// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";
// ⬇️ CẬP NHẬT: import Provider và Modal mới
import { ContactModalProvider } from "@/components/originkit/ui/hero-31/contact-modal-context";
import { ContactModal } from "@/components/originkit/ui/hero-31/contact-modal";

const FADE_FILL =
  "linear-gradient(to top, #002fff 0, #002fff var(--fade-solid), transparent 100%)";

export const SectionHero = () => (
  // ⬇️ CẬP NHẬT: bọc toàn bộ nội dung hero trong Provider — Navbar và
  // InfoBand (chứa EmailCapture) đều nằm trong nhánh con này nên cùng
  // truy cập được state mở/đóng modal.
  <ContactModalProvider>
    <main className="animate-hero-reveal relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-[#002fff]">
      <WaveField />

      <div
        aria-hidden
        style={{ backgroundImage: FADE_FILL }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[567px] [--fade-solid:266px] md:h-[629px] md:[--fade-solid:264px] lg:h-[416px] lg:[--fade-solid:116px]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full"
      >
        <span className="absolute inset-y-0 left-[20px] w-px bg-white/15 md:left-[56px]" />
        <span className="absolute inset-y-0 right-[20px] w-px bg-white/15 md:right-[56px]" />
      </div>

      <div className="w-full z-50 shrink-0">
        <Navbar />
      </div>

      <div className={`${STAGE} min-h-0 flex-1 px-[40px] md:px-[80px] z-10 flex flex-col justify-end pb-12`}>
        <h1 className="mb-16 lg:mb-20 text-center md:text-left font-sans font-normal text-[clamp(44px,7.5vw,80px)] lg:text-[100px] leading-[1.05] tracking-[-0.04em] text-white antialiased" style={{ fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif', fontWeight: 300 }}>
          Learn by Sharing
          <br />
          Share by Learning
        </h1>

        <div className="w-full">
          <InfoBand />
        </div>
      </div>

      <div
        aria-hidden
        className="h-[20px] shrink-0 md:h-[22px] lg:h-[24px]"
      />
    </main>

    {/* ⬇️ CẬP NHẬT: render modal 1 lần duy nhất ở đây — nó tự ẩn/hiện
        dựa vào state trong context, không cần đặt nhiều nơi */}
    <ContactModal />
  </ContactModalProvider>
);
