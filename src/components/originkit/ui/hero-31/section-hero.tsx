// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import Image from "next/image";
import Link from "next/link";
import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import {
  ProcessCanvas,
  ProcessCanvasCompact,
  type HeroStudy,
} from "@/components/originkit/ui/hero-31/process-canvas";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";
import { useContactModal } from "@/components/originkit/ui/hero-31/contact-modal-context";
import { SITE_NAME, SITE_ROLE } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";

// MỚI: Navbar + ContactModalProvider + ContactModal đã dời lên
// layout.tsx (dùng chung cho mọi trang, không chỉ trang chủ). Bỏ hết
// khỏi đây để tránh render trùng 2 lần trên trang chủ.
// study: case study mới nhất — hiện ở frame Hi-fi của canvas (null nếu chưa có)
export const SectionHero = ({ study }: { study: HeroStudy | null }) => {
  const { openModal } = useContactModal();

  return (
  <main className="animate-hero-reveal relative isolate flex min-h-[calc(100dvh-80px)] w-full flex-col overflow-hidden bg-brand">
    {/* Nền canvas kiểu Figma: lưới chấm trắng rất nhạt trên xanh brand
        (thay cho pattern sóng WebGL của template) */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)] [background-size:20px_20px]"
    />

    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full"
    >
      <span className="absolute inset-y-0 left-[20px] w-px bg-white/15 md:left-[56px]" />
      <span className="absolute inset-y-0 right-[20px] w-px bg-white/15 md:right-[56px]" />
    </div>

    <div className={`${STAGE} min-h-0 flex-1 px-[40px] md:px-[80px] z-10 flex flex-col justify-end pt-12 pb-12`}>

      {/* Mobile: frame Hi-fi ở trên chữ. Tablet: chữ trên, canvas dưới.
          Desktop: chữ trái, canvas phải. */}
      <div className="mb-16 grid grid-cols-1 items-center gap-8 md:gap-12 lg:mb-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="md:hidden">
          <ProcessCanvasCompact study={study} />
        </div>

        <div>
          <div className="mb-4 flex justify-center md:mb-6 md:justify-start">
            <div className="h-14 w-14 shrink-0 md:h-28 md:w-28 overflow-hidden rounded-full shadow-lg ring-2 ring-white/20">
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
          <h1 className="mb-8 text-center font-display text-[clamp(30px,8.5vw,80px)] font-light leading-[1.05] tracking-[-0.04em] text-white antialiased md:text-left lg:text-[clamp(48px,4.8vw,88px)]">
            <span className="block whitespace-nowrap">Learn by Sharing</span>
            <span className="block whitespace-nowrap">Share by Learning</span>
          </h1>

          <div className="flex flex-col items-center gap-8 md:items-start">
            <p className="max-w-xl text-center text-lg leading-relaxed text-white/85 md:text-left md:text-xl">
              I design end-to-end products and build AI into how I work — from research synthesis to high-fidelity prototypes, faster.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/work"
                onClick={() => trackEvent({ name: "CTA Click", props: { cta: "hero_view_work" } })}
                className="flex min-h-12 items-center justify-center bg-white px-6 text-base font-semibold text-brand transition hover:bg-white/90"
              >
                View my work
              </Link>
              <button
                type="button"
                onClick={() => openModal(undefined, "hero_book_call")}
                className="flex min-h-12 cursor-pointer items-center justify-center border border-white/60 px-6 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Book a call
              </button>
            </div>
          </div>
        </div>

        <div className="hidden w-full md:block md:max-w-2xl lg:max-w-none">
          <ProcessCanvas study={study} />
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
