// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import Image from "next/image";
import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";
import { ContactModalProvider } from "@/components/originkit/ui/hero-31/contact-modal-context";
import { ContactModal } from "@/components/originkit/ui/hero-31/contact-modal";

const FADE_FILL =
  "linear-gradient(to top, #002fff 0, #002fff var(--fade-solid), transparent 100%)";

export const SectionHero = () => (
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

        {/* FIX: trước có cả md:h-36 md:w-36 LẪN md:h-24 md:w-24 trên cùng
            1 thẻ — 2 class xung đột nhau, đây là lý do avatar "không đổi
            size" dù đã sửa. Giờ chỉ còn đúng 1 kích thước 144px xuyên
            suốt mọi breakpoint (khớp yêu cầu 144x144 ban đầu). */}
        <div className="mb-6 flex justify-center md:justify-start">
          <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full shadow-lg ring-2 ring-white/20">
            <Image
              src="/avatar.png"
              alt="Binh Nguyen"
              width={144}
              height={144}
              priority
              className="h-full w-full object-cover"
            />
          </div>
        </div>

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

    <ContactModal />
  </ContactModalProvider>
);
