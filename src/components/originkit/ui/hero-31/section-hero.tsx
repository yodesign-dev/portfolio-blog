// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import Link from "next/link";
import { AvatarLoop } from "@/components/originkit/ui/hero-31/avatar-loop";
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

      {/* Mobile: chữ + CTA trước, frame Hi-fi xuống dưới (trước đây frame
          nằm trên, đẩy tên/H1/CTA xuống gần đáy màn hình đầu).
          Tablet: chữ trên, canvas dưới. Desktop: chữ trái, canvas phải —
          canvas được chia rộng hơn để đọc được câu chuyện Research → Hi-fi. */}
      <div className="mb-16 grid grid-cols-1 items-center gap-10 md:gap-12 lg:mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <div className="mb-4 flex justify-center md:mb-6 md:justify-start">
            <div className="h-14 w-14 shrink-0 md:h-28 md:w-28 overflow-hidden rounded-full shadow-lg ring-2 ring-white/20">
              <AvatarLoop alt={SITE_NAME} />
            </div>
          </div>

          {/* Định vị: người xem cần biết "ai, làm gì" trước khi đọc slogan */}
          <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/80 md:text-left">
            {SITE_NAME} · {SITE_ROLE}
          </p>

          {/* H1 nói giá trị (làm gì, khác gì) thay cho slogan "Learn by
              Sharing" — người mới vào cần hiểu trong 5 giây. Slogan vẫn còn ở
              footer. text-balance để các dòng dài ngắn đều khi xuống dòng. */}
          <h1 className="mb-6 text-balance text-center font-display text-[clamp(32px,8vw,56px)] font-light leading-[1.08] tracking-[-0.035em] text-white antialiased md:text-left lg:text-[clamp(40px,3.6vw,64px)]">
            From user research to hi-fi — faster, with AI.
          </h1>

          <div className="flex flex-col items-center gap-8 md:items-start">
            <p className="max-w-xl text-center text-lg leading-relaxed text-white/85 md:text-left md:text-xl">
              I design end-to-end products and build AI into every step — research synthesis, wireframes, and high-fidelity prototypes.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/work"
                onClick={() => trackEvent({ name: "CTA Click", props: { cta: "hero_view_work" } })}
                className="flex min-h-12 items-center justify-center bg-white px-6 text-base font-semibold text-brand transition hover:bg-white/90"
              >
                View my work
              </Link>
              {/* Cùng nhãn "Get in touch" với nav/footer — mọi CTA liên hệ
                  mở chung 1 modal (gửi tin hoặc đặt lịch), tránh để người
                  xem tưởng là 3 kênh khác nhau. Giữ source cũ cho analytics. */}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => openModal(undefined, "hero_book_call")}
                className="flex min-h-12 cursor-pointer items-center justify-center border border-white/60 px-6 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Get in touch
              </button>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <ProcessCanvasCompact study={study} />
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
