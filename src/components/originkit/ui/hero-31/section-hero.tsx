// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import Image from "next/image";
import Link from "next/link";
import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";
import { useContactModal } from "@/components/originkit/ui/hero-31/contact-modal-context";
import { SITE_NAME, SITE_ROLE } from "@/lib/site";

const FADE_FILL =
  "linear-gradient(to top, #002fff 0, #002fff var(--fade-solid), transparent 100%)";

// MỚI: Navbar + ContactModalProvider + ContactModal đã dời lên
// layout.tsx (dùng chung cho mọi trang, không chỉ trang chủ). Bỏ hết
// khỏi đây để tránh render trùng 2 lần trên trang chủ.
export const SectionHero = () => {
  const { openModal } = useContactModal();

  return (
  <main className="animate-hero-reveal relative isolate flex min-h-[calc(100dvh-80px)] w-full flex-col overflow-hidden bg-brand">
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

    <div className={`${STAGE} min-h-0 flex-1 px-[40px] md:px-[80px] z-10 flex flex-col justify-end pt-12 pb-12`}>

      <div className="mb-6 flex justify-center md:justify-start">
        <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full shadow-lg ring-2 ring-white/20">
          <Image
            src="/avatar.png"
            alt={SITE_NAME}
            width={144}
            height={144}
            priority
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Định vị: người xem cần biết "ai, làm gì" trước khi đọc slogan */}
      <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/80 md:text-left">
        {SITE_NAME} · {SITE_ROLE}
      </p>

      {/* Mỗi vế slogan giữ trên 1 dòng: cỡ chữ mobile theo 8.5vw (vừa khung
          ~300px ở màn 375px) thay vì 44px cố định khiến "Share by Learning"
          bị gãy thành 2 dòng. */}
      <h1 className="mb-8 text-center font-display text-[clamp(30px,8.5vw,80px)] font-light leading-[1.05] tracking-[-0.04em] text-white antialiased md:text-left lg:text-[100px]">
        <span className="block whitespace-nowrap">Learn by Sharing</span>
        <span className="block whitespace-nowrap">Share by Learning</span>
      </h1>

      <div className="mb-16 flex flex-col items-center gap-8 md:items-start lg:mb-20">
        <p className="max-w-xl text-center text-lg leading-relaxed text-white/85 md:text-left md:text-xl">
          I design end-to-end products and build AI into how I work — from research synthesis to high-fidelity prototypes, faster.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/work"
            className="flex min-h-12 items-center justify-center bg-white px-6 text-base font-semibold text-brand transition hover:bg-white/90"
          >
            View my work
          </Link>
          <button
            type="button"
            onClick={() => openModal()}
            className="flex min-h-12 cursor-pointer items-center justify-center border border-white/60 px-6 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Book a call
          </button>
        </div>
      </div>

      <div className="w-full">
        <InfoBand />
      </div>

    </div>

    <div
      aria-hidden
      className="h-[20px] shrink-0 md:h-[22px] lg:h-[24px]"
    />
  </main>
  );
};
