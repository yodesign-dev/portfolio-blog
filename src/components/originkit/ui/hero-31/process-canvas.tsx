"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Canvas "người × AI" ở hero: 3 frame Research → Wireframe → Hi-fi kiểu
// Figma, 2 con trỏ "Bin" và "AI" cùng làm việc rồi gặp nhau ở Hi-fi, nơi
// Bin dựng skeleton bản web còn AI dựng bản mobile.
// Keyframes nằm trong hero-31.css (pc-*). Vị trí trong style={{left,top}}
// của con trỏ là vị trí CUỐI (cạnh Hi-fi) — cũng là khung tĩnh khi người
// dùng bật prefers-reduced-motion (animation bị tắt, còn lại style này).

export type HeroStudy = {
  title: string;
  href: string;
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

// Skeleton UI web + mobile của khung Hi-fi. Khi `animated`, từng khối được
// "dựng" lần lượt trong lúc 2 con trỏ làm việc ở Hi-fi: Bin dựng bản web,
// AI dựng bản mobile song song — khối nào vừa dựng loé màu của người dựng.
// Mốc thời gian (t) là % của vòng 14s, khớp với pc-bin / pc-ai trong hero-31.css.
const BIN = "#c7d2ff";
const AI = "#a5f3fc";
const SKELETON = "#e9ecf2";

const BUILD_TIMES = [61, 63, 64, 66, 67, 69, 70, 71, 73, 74, 76, 77, 78, 80];
const BUILD_KEYFRAMES = BUILD_TIMES.map(
  (t) =>
    `@keyframes pc-b-${t}{0%,${t}%{opacity:.14;transform:scale(.94);background-color:var(--pc-base)}` +
    `${t + 1.5}%{opacity:1;transform:scale(1.04);background-color:var(--pc-flash)}` +
    `${t + 5}%,93%{opacity:1;transform:scale(1);background-color:var(--pc-base)}` +
    `98%,100%{opacity:.14;transform:scale(.94);background-color:var(--pc-base)}}`
).join("");

function Bit({
  t,
  by,
  animated,
  base = SKELETON,
  className = "",
}: {
  t: number;
  by: "bin" | "ai";
  animated: boolean;
  base?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2px] ${animated ? "pc-anim pc-build" : ""} ${className}`}
      style={
        {
          backgroundColor: base,
          "--pc-base": base,
          "--pc-flash": by === "bin" ? BIN : AI,
          animationName: animated ? `pc-b-${t}` : undefined,
        } as React.CSSProperties
      }
    />
  );
}

function SkeletonScreens({ animated }: { animated: boolean }) {
  return (
    <div className="relative h-full">
      {/* Web — Bin dựng */}
      <div className="absolute left-0 top-0 flex h-[88%] w-[80%] flex-col overflow-hidden rounded-md bg-white">
        <div className="flex h-[13%] items-center gap-[3%] border-b border-neutral-100 px-[3%]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6159]" />
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffbd2e]" />
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#28c941]" />
          <Bit t={61} by="bin" animated={animated} className="ml-[4%] h-[45%] flex-1 !rounded-full" />
          <Bit t={61} by="bin" animated={animated} className="aspect-square h-[55%] !rounded-full" />
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-[22%] flex-col gap-[8%] border-r border-neutral-100 p-[4%]">
            <Bit t={64} by="bin" animated={animated} base="#dfe7ff" className="h-[12%] w-[75%] !rounded-full" />
            <Bit t={64} by="bin" animated={animated} className="h-[6%]" />
            <Bit t={64} by="bin" animated={animated} className="h-[6%] w-[80%]" />
            <Bit t={64} by="bin" animated={animated} className="h-[6%] w-[65%]" />
            <Bit t={64} by="bin" animated={animated} className="h-[6%] w-[75%]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[5%] p-[4%]">
            <Bit t={67} by="bin" animated={animated} className="h-[5%] w-[28%]" />
            <div className="grid h-[34%] grid-cols-3 gap-[4%]">
              {[67, 69, 71].map((t) => (
                <div key={t} className="flex flex-col gap-[10%] rounded-[3px] border border-neutral-100 p-[6%]">
                  <Bit t={t} by="bin" animated={animated} className="flex-1" />
                  <Bit t={t} by="bin" animated={animated} className="h-[12%] w-[70%]" />
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              {[
                { t: 74, dot: "#e24b4a" },
                { t: 76, dot: "#ef9f27" },
                { t: 78, dot: "#1d9e75" },
                { t: 80, dot: "#7f77dd" },
              ].map((row) => (
                <div key={row.t} className="flex h-[16%] items-center gap-[3%]">
                  <Bit t={row.t} by="bin" animated={animated} base={row.dot} className="aspect-[5/4] h-full" />
                  <Bit t={row.t} by="bin" animated={animated} className="h-[70%] flex-1" />
                  <Bit t={row.t} by="bin" animated={animated} className="h-[70%] w-[20%]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile — AI dựng */}
      <div className="absolute right-[1%] top-[16%] flex h-[84%] w-[23%] flex-col gap-[5%] rounded-[10px] border-2 border-ink bg-white px-[4%] pb-[6%] pt-[5%]">
        <span className="mx-auto h-[2.5%] w-[35%] shrink-0 rounded-full bg-ink" />
        <Bit t={63} by="ai" animated={animated} className="h-[7%] shrink-0 !rounded-full" />
        <Bit t={66} by="ai" animated={animated} className="h-[26%] shrink-0" />
        <Bit t={70} by="ai" animated={animated} className="h-[4%] w-[85%] shrink-0" />
        <Bit t={70} by="ai" animated={animated} className="h-[4%] w-[60%] shrink-0" />
        <Bit t={73} by="ai" animated={animated} className="h-[4%] w-[75%] shrink-0" />
        <Bit t={73} by="ai" animated={animated} className="h-[4%] w-[50%] shrink-0" />
        <Bit t={77} by="ai" animated={animated} base="#bfcbff" className="mt-auto h-[9%] shrink-0 !rounded-full" />
      </div>
    </div>
  );
}

function HiFiFrame({
  study,
  className = "",
  animated = false,
}: {
  study: HeroStudy | null;
  className?: string;
  animated?: boolean;
}) {
  const body = (
    <div
      className={`relative h-full rounded-md outline-2 outline-offset-4 outline-transparent transition-transform duration-300 ease-out ${
        animated ? "pc-anim pc-hifi" : ""
      } ${study ? "group-hover:-translate-y-1" : ""}`}
    >
      <SkeletonScreens animated={animated} />
      {study && (
        <span className="absolute bottom-2 left-2 rounded bg-ink/85 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
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
      <HiFiFrame study={study} animated className="absolute left-[46%] top-[8%] h-[62%] w-[52%]" />
      <style>{BUILD_KEYFRAMES}</style>

      <Cursor label="Bin" tone="bin" className="pc-anim pc-cursor-bin" style={{ left: "62%", top: "56%" }} />
      <Cursor label="AI" tone="ai" className="pc-anim pc-cursor-ai" style={{ left: "88%", top: "60%" }} />
    </div>
  );
}

// Mobile: chỉ frame Hi-fi + con trỏ AI đứng yên — màn nhỏ có chuyển động dễ rối
export function ProcessCanvasCompact({ study }: { study: HeroStudy | null }) {
  return (
    <div className="relative">
      <HiFiFrame study={study} className="aspect-[16/10] w-full" />
      <Cursor label="AI" tone="ai" style={{ right: "18%", bottom: "-6px" }} />
    </div>
  );
}
