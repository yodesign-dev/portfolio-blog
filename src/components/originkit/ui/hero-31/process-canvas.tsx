"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Canvas "người × AI" ở hero: 3 frame Research → Wireframe → Hi-fi kiểu
// Figma, 2 con trỏ "Bin" và "AI" cùng làm việc rồi gặp nhau ở Hi-fi.
// Keyframes nằm trong hero-31.css (pc-*). Vị trí trong style={{left,top}}
// của con trỏ là vị trí CUỐI (cạnh Hi-fi) — cũng là khung tĩnh khi người
// dùng bật prefers-reduced-motion (animation bị tắt, còn lại style này).

export type HeroStudy = {
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
};

const NOTES = [
  { i: 0, visited: true },
  { i: 1, visited: true },
  { i: 2, visited: true },
  { i: 3, visited: false },
  { i: 4, visited: true },
  { i: 5, visited: false },
];

function Cursor({
  label,
  tone,
  className = "",
  style,
}: {
  label: string;
  tone: "bin" | "ai";
  className?: string;
  style?: React.CSSProperties;
}) {
  const fill = tone === "bin" ? "#ffffff" : "#00ddff";
  return (
    <div className={`pointer-events-none absolute z-20 ${className}`} style={style}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2 1.5 L15 8.2 L9 9.6 L6.4 15.5 Z" fill={fill} stroke="#0b1432" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span
        className={`ml-3 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
          tone === "bin" ? "bg-white text-brand" : "bg-accent text-ink"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function FrameLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium tracking-wide text-white/70">{children}</p>;
}

function HiFiBody({ study, sizes, priority }: { study: HeroStudy | null; sizes: string; priority?: boolean }) {
  if (!study) {
    // Chưa có case study nào: khung UI trừu tượng thay cho ảnh thật
    return (
      <div className="flex h-full flex-col gap-2 bg-white p-3">
        <div className="h-3 w-1/2 rounded bg-brand/80" />
        <div className="h-2 w-3/4 rounded bg-neutral-200" />
        <div className="mt-1 grid flex-1 grid-cols-3 gap-2">
          <div className="rounded bg-neutral-100" />
          <div className="rounded bg-neutral-100" />
          <div className="rounded bg-neutral-100" />
        </div>
      </div>
    );
  }
  return (
    <Image
      src={study.imageUrl}
      alt={study.imageAlt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover object-top"
    />
  );
}

function HiFiFrame({
  study,
  className = "",
  sizes,
  animated = false,
}: {
  study: HeroStudy | null;
  className?: string;
  sizes: string;
  animated?: boolean;
}) {
  const body = (
    <div
      className={`relative h-full overflow-hidden rounded-md bg-white outline-2 outline-offset-4 outline-transparent transition-transform duration-300 ease-out ${
        animated ? "pc-anim pc-hifi" : ""
      } ${study ? "group-hover:-translate-y-1" : ""}`}
    >
      <HiFiBody study={study} sizes={sizes} priority />
      {study && (
        <span className="absolute bottom-2 right-2 rounded bg-ink/85 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          View case study →
        </span>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <FrameLabel>Hi-fi{study ? ` · ${study.title}` : ""}</FrameLabel>
      {study ? (
        <Link
          href={study.href}
          aria-label={`${study.title} — case study`}
          className="group block min-h-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          {body}
        </Link>
      ) : (
        <div className="min-h-0 flex-1">{body}</div>
      )}
    </div>
  );
}

// Tablet/desktop: đủ 3 frame + 2 con trỏ chuyển động
export function ProcessCanvas({ study }: { study: HeroStudy | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Dừng chuyển động khi hero cuộn khỏi màn hình — tiết kiệm pin/CPU
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-paused={paused} className="relative aspect-[4/3] w-full">
      {/* Đường nối Research → Wireframe → Hi-fi */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        <path d="M80 124 C 80 146, 96 140, 96 160" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <path d="M168 222 C 200 222, 232 226, 232 214" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Research */}
      <div aria-hidden="true" className="absolute left-[2%] top-[4%] flex h-[36%] w-[36%] flex-col">
        <FrameLabel>Research</FrameLabel>
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-1.5 rounded-md border border-dashed border-white/60 bg-white/10 p-2">
          {NOTES.map((note) => (
            <div
              key={note.i}
              className={`rounded-sm bg-amber-100 ${note.visited ? "pc-anim pc-note" : ""}`}
              style={note.visited ? ({ "--pc-i": note.i === 4 ? 3 : note.i } as React.CSSProperties) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Wireframe */}
      <div aria-hidden="true" className="absolute left-[6%] top-[54%] flex h-[38%] w-[36%] flex-col">
        <FrameLabel>Wireframe</FrameLabel>
        <div className="pc-anim pc-wire flex flex-1 flex-col gap-1.5 rounded-md bg-white p-2.5">
          <div className="h-2.5 w-1/2 rounded-sm border border-dashed border-neutral-400" />
          <div className="flex-1 rounded-sm border border-dashed border-neutral-400" />
          <div className="flex gap-1.5">
            <div className="h-3 flex-1 rounded-sm border border-dashed border-neutral-400" />
            <div className="h-3 flex-1 rounded-sm border border-dashed border-neutral-400" />
          </div>
        </div>
      </div>

      {/* Hi-fi — link thật tới case study mới nhất */}
      <HiFiFrame
        study={study}
        animated
        className="absolute left-[46%] top-[8%] h-[62%] w-[52%]"
        sizes="(min-width: 1024px) 30vw, 50vw"
      />

      <Cursor label="Bin" tone="bin" className="pc-anim pc-cursor-bin" style={{ left: "62%", top: "36%" }} />
      <Cursor label="AI" tone="ai" className="pc-anim pc-cursor-ai" style={{ left: "80%", top: "44%" }} />
    </div>
  );
}

// Mobile: chỉ frame Hi-fi + con trỏ AI đứng yên — màn nhỏ có chuyển động dễ rối
export function ProcessCanvasCompact({ study }: { study: HeroStudy | null }) {
  return (
    <div className="relative">
      <HiFiFrame study={study} className="aspect-[16/10] w-full" sizes="100vw" />
      <Cursor label="AI" tone="ai" style={{ right: "18%", bottom: "-6px" }} />
    </div>
  );
}
