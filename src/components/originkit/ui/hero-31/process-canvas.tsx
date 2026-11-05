"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AI_TONE, BIN_TONE, Cursor } from "@/components/originkit/ui/hero-31/cursor";
import { SwarmIntro, type SwarmPart } from "@/components/originkit/ui/hero-31/swarm-intro";

// Canvas "Bin × AI" ở hero: 3 frame Research → Wireframe → Hi-fi kiểu Figma.
// Thông điệp: Bin là người định hướng và quyết định, AI chỉ chạy theo lệnh và
// làm phần tốn sức (dựng nhiều phương án, nhân sửa đổi sang màn khác). AI
// không bao giờ nhận xét bài của Bin; AI chỉ động khi Bin vừa ra lệnh, còn lại
// đứng mờ chờ. Vị trí trong style={{left,top}} của con trỏ là vị trí CUỐI
// (lúc Bin vừa duyệt) — cũng là khung tĩnh khi bật prefers-reduced-motion.
// Mọi phần tử cũng vậy: style gốc = trạng thái cuối, keyframes lo phần ẩn/hiện.

export type HeroStudy = {
  title: string;
  href: string;
};

// Note Bin tô làm insight
const PICKED_NOTES = [0, 2];

function FrameLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-1.5 text-xs font-semibold tracking-wide text-white/85 ${className}`}>{children}</p>;
}

// ---------- Kịch bản 1 vòng (giây, trên thang LOOP_SECONDS) ----------
//   0–2.8s     Bin đọc research: tô 2 note, gõ insight. AI đứng mờ chờ
//   3.3–5.1s   Bin phác Wireframe
//   5.5–6.6s   Bin gõ brief cụ thể cho AI rồi Enter; nét đứt nối brief → AI
//   7.0–8.2s   AI dựng nhanh 3 phương án mobile A/B/C rồi lại đứng chờ
//   8.5–10.3s  Bin loại A, B, chọn C
//   10.5–11.3s Bin tự tay kéo nút CTA xuống vùng ngón cái
//   11.6–12.3s AI áp sửa của Bin sang bản web
//   12.6s      Bin bấm Approve → "✓ Approved by Bin"
//   14.3–15s   Hai con trỏ về chỗ đầu, mọi thứ reset
// Toạ độ con trỏ là left/top theo % khung canvas.
export const LOOP_SECONDS = 15;
// Thời lượng phát thật của 1 vòng — đổi số này là mọi bước co giãn theo
const PLAYBACK_SECONDS = 15;
const pct = (sec: number) => +((sec / LOOP_SECONDS) * 100).toFixed(2);
const keyframes = (name: string, stops: [number, string][]) =>
  `@keyframes ${name}{${stops.map(([sec, css]) => `${pct(sec)}%{${css}}`).join("")}}`;
const at = (left: number, top: number, opacity = 1) => `left:${left}%;top:${top}%;opacity:${opacity}`;
// Chỗ đứng đầu vòng của 2 con trỏ — đoạn mở màn bầy con trỏ thu về đúng đây.
// Bin đứng cạnh Research (bắt đầu ngay), AI đứng chờ dưới khung Hi-fi.
const BIN_HOME = { x: 40, y: 24 };
const AI_HOME = { x: 75, y: 80 };
const SWARM_SEEN_KEY = "hero-swarm-seen";

const SKELETON = "#e9ecf2";
const AI_FLASH = "#a5f3fc";
const PILL_BEFORE = "#dfe7ff";
const PILL_AFTER = "#1d3fff";
const CTA_SOFT = "#bfcbff";
const END = 14.3; // bắt đầu reset

// Lúc Bin bấm / AI dựng (dùng chung cho con trỏ và phần tử bị tác động)
const T = {
  hl: [0.75, 1.5],
  insight: 2.1,
  enter: 6.6,
  variants: [7.05, 7.4, 7.75],
  reject: [9.0, 9.65],
  pick: 10.3,
  dragStart: 10.55,
  dragEnd: 11.3,
  apply: 12.15,
  approve: 12.65,
};

const hidden = "opacity:0;transform:scale(.9);background-color:#fff;outline-color:transparent";
const shown = "opacity:1;transform:scale(1);background-color:#fff;outline-color:transparent";
const flash = `opacity:1;transform:scale(1.04);background-color:${AI_FLASH};outline-color:transparent`;
const dim = "opacity:.25;transform:scale(1);background-color:#fff;outline-color:transparent";
const picked = "opacity:1;transform:scale(1);background-color:#fff;outline-color:#fff";
const fade = (name: string, on: number, off: number, extra = "") =>
  keyframes(name, [
    [0, `opacity:0;${extra}`],
    [on - 0.1, `opacity:0;${extra}`],
    [on + 0.05, "opacity:1"],
    [off, "opacity:1"],
    [off + 0.2, `opacity:0;${extra}`],
    [LOOP_SECONDS, `opacity:0;${extra}`],
  ]);

const STORY_KEYFRAMES = [
  keyframes("pc-bin", [
    [0, at(BIN_HOME.x, BIN_HOME.y)],
    [0.6, at(8, 16)],
    [0.9, at(8, 16)],
    [1.35, at(31, 16)],
    [1.7, at(31, 16)],
    [2.05, at(27, 44)],
    [2.8, at(27, 44)],
    [3.3, at(9, 61)],
    [3.9, at(36, 63)],
    [4.5, at(11, 77)],
    [5.1, at(36, 88)],
    [5.55, at(69, 66)],
    [6.8, at(69, 66)],
    [7.3, at(44, 48)],
    [8.5, at(44, 48)],
    [8.85, at(56, 47)],
    [9.2, at(56, 47)],
    [9.5, at(73, 47)],
    [9.85, at(73, 47)],
    [10.15, at(88, 40.5)],
    [T.dragStart, at(88, 40.5)],
    [T.dragEnd, at(88, 63.5)],
    [11.7, at(88, 63.5)],
    [12.35, at(85, 16)],
    [T.approve + 0.2, at(85, 16)],
    // Bấm xong lùi xuống để không che chữ "Approved by Bin"
    [13.3, at(91, 21)],
    [END, at(91, 21)],
    [LOOP_SECONDS, at(BIN_HOME.x, BIN_HOME.y)],
  ]),
  // AI mờ khi chờ lệnh, chỉ sáng lúc làm việc Bin giao
  keyframes("pc-ai", [
    [0, at(AI_HOME.x, AI_HOME.y, 0.5)],
    [T.enter, at(AI_HOME.x, AI_HOME.y, 0.5)],
    [T.enter + 0.2, at(AI_HOME.x, AI_HOME.y)],
    [7.0, at(56, 30)],
    [7.35, at(73, 30)],
    [7.7, at(89, 30)],
    [8.2, at(AI_HOME.x, AI_HOME.y)],
    [8.4, at(AI_HOME.x, AI_HOME.y, 0.5)],
    [11.4, at(AI_HOME.x, AI_HOME.y, 0.5)],
    [11.6, at(AI_HOME.x, AI_HOME.y)],
    [12.0, at(49, 21)],
    [END, at(49, 21)],
    [LOOP_SECONDS, at(AI_HOME.x, AI_HOME.y, 0.5)],
  ]),
  // Bin tô note: sáng vàng + viền trắng, giữ tới hết vòng
  ...PICKED_NOTES.map((n, i) =>
    keyframes(`pc-hl-${n}`, [
      [0, "background-color:#fef3c7;outline-color:transparent;transform:scale(1)"],
      [T.hl[i], "background-color:#fef3c7;outline-color:transparent;transform:scale(1)"],
      [T.hl[i] + 0.1, "background-color:#fcd34d;outline-color:#fff;transform:scale(1.1)"],
      [T.hl[i] + 0.3, "background-color:#fcd34d;outline-color:#fff;transform:scale(1)"],
      [END, "background-color:#fcd34d;outline-color:#fff;transform:scale(1)"],
      [END + 0.3, "background-color:#fef3c7;outline-color:transparent;transform:scale(1)"],
      [LOOP_SECONDS, "background-color:#fef3c7;outline-color:transparent;transform:scale(1)"],
    ])
  ),
  fade("pc-insight", T.insight, END),
  keyframes("pc-insight-type", [
    [0, "clip-path:inset(0 100% 0 0)"],
    [T.insight, "clip-path:inset(0 100% 0 0)"],
    [T.insight + 0.6, "clip-path:inset(0 0 0 0)"],
    [LOOP_SECONDS, "clip-path:inset(0 0 0 0)"],
  ]),
  keyframes("pc-wire", [
    [0, "opacity:.35"],
    [3.3, "opacity:.35"],
    [5.1, "opacity:1"],
    [END, "opacity:1"],
    [END + 0.5, "opacity:.35"],
    [LOOP_SECONDS, "opacity:.35"],
  ]),
  // Brief của Bin: hiện → chữ gõ dần → Enter loé → ẩn
  keyframes("pc-prompt", [
    [0, "opacity:0;transform:translateY(4px)"],
    [5.45, "opacity:0;transform:translateY(4px)"],
    [5.6, "opacity:1;transform:translateY(0)"],
    [6.9, "opacity:1;transform:translateY(0)"],
    [7.1, "opacity:0;transform:translateY(4px)"],
    [LOOP_SECONDS, "opacity:0;transform:translateY(4px)"],
  ]),
  keyframes("pc-typing", [
    [0, "clip-path:inset(0 100% 0 0)"],
    [5.7, "clip-path:inset(0 100% 0 0)"],
    [6.45, "clip-path:inset(0 0 0 0)"],
    [LOOP_SECONDS, "clip-path:inset(0 0 0 0)"],
  ]),
  keyframes("pc-enter", [
    [0, "transform:scale(1);background-color:#0f2bff"],
    [T.enter - 0.05, "transform:scale(1);background-color:#0f2bff"],
    [T.enter + 0.02, "transform:scale(.8);background-color:#00ddff"],
    [T.enter + 0.25, "transform:scale(1);background-color:#0f2bff"],
    [LOOP_SECONDS, "transform:scale(1);background-color:#0f2bff"],
  ]),
  // Nét đứt brief → AI: lệnh đi từ Bin sang AI
  fade("pc-link", T.enter + 0.05, 7.1),
  // 3 phương án AI dựng; A, B bị Bin loại
  ...[0, 1].map((i) =>
    keyframes(`pc-v-${i}`, [
      [0, hidden],
      [T.variants[i], hidden],
      [T.variants[i] + 0.15, flash],
      [T.variants[i] + 0.5, shown],
      [T.reject[i], shown],
      [T.reject[i] + 0.15, dim],
      [T.pick, dim],
      [T.pick + 0.3, hidden],
      [LOOP_SECONDS, hidden],
    ])
  ),
  keyframes("pc-v-2", [
    [0, hidden],
    [T.variants[2], hidden],
    [T.variants[2] + 0.15, flash],
    [T.variants[2] + 0.5, shown],
    [T.pick - 0.05, shown],
    [T.pick + 0.05, picked],
    [END, picked],
    [END + 0.3, hidden],
    [LOOP_SECONDS, hidden],
  ]),
  ...[0, 1].map((i) =>
    keyframes(`pc-x-${i}`, [
      [0, "opacity:0;transform:scale(.6)"],
      [T.reject[i], "opacity:0;transform:scale(.6)"],
      [T.reject[i] + 0.1, "opacity:1;transform:scale(1.15)"],
      [T.reject[i] + 0.25, "opacity:1;transform:scale(1)"],
      [T.pick, "opacity:1;transform:scale(1)"],
      [T.pick + 0.3, "opacity:0;transform:scale(1)"],
      [LOOP_SECONDS, "opacity:0;transform:scale(.6)"],
    ])
  ),
  fade("pc-opts", T.variants[2] + 0.15, 8.9),
  // Bin tự kéo CTA của bản C từ giữa màn xuống vùng ngón cái
  keyframes("pc-cta", [
    [0, "transform:translateY(-680%)"],
    [T.dragStart, "transform:translateY(-680%)"],
    [T.dragEnd, "transform:translateY(0)"],
    [END + 0.3, "transform:translateY(0)"],
    [END + 0.35, "transform:translateY(-680%)"],
    [LOOP_SECONDS, "transform:translateY(-680%)"],
  ]),
  // AI nhân sửa của Bin sang bản web: nút chính đổi sang màu brand
  keyframes("pc-pill", [
    [0, `background-color:${PILL_BEFORE};outline-color:transparent`],
    [T.apply - 0.05, `background-color:${PILL_BEFORE};outline-color:transparent`],
    [T.apply + 0.05, `background-color:${PILL_AFTER};outline-color:#00ddff`],
    [T.apply + 0.5, `background-color:${PILL_AFTER};outline-color:transparent`],
    [END, `background-color:${PILL_AFTER};outline-color:transparent`],
    [END + 0.3, `background-color:${PILL_BEFORE};outline-color:transparent`],
    [LOOP_SECONDS, `background-color:${PILL_BEFORE};outline-color:transparent`],
  ]),
  fade("pc-applied", T.apply + 0.05, 13.4),
  // Nút duyệt của Bin: "Approve" → bấm → "✓ Approved by Bin"
  fade("pc-chip", 12.3, END),
  keyframes("pc-chip-before", [
    [0, "opacity:1"],
    [T.approve + 0.05, "opacity:1"],
    [T.approve + 0.12, "opacity:0"],
    [LOOP_SECONDS, "opacity:0"],
  ]),
  keyframes("pc-chip-after", [
    [0, "opacity:0"],
    [T.approve + 0.08, "opacity:0"],
    [T.approve + 0.2, "opacity:1"],
    [LOOP_SECONDS, "opacity:1"],
  ]),
  keyframes("pc-press", [
    [0, "transform:scale(1)"],
    [T.approve - 0.05, "transform:scale(1)"],
    [T.approve, "transform:scale(.85)"],
    [T.approve + 0.1, "transform:scale(1)"],
    [LOOP_SECONDS, "transform:scale(1)"],
  ]),
  keyframes("pc-hifi", [
    [0, "outline-color:transparent"],
    [T.approve, "outline-color:transparent"],
    [T.approve + 0.2, "outline-color:rgb(255 255 255 / .85)"],
    [END - 0.1, "outline-color:rgb(255 255 255 / .85)"],
    [END + 0.2, "outline-color:transparent"],
    [LOOP_SECONDS, "outline-color:transparent"],
  ]),
].join("");

const anim = (animated: boolean, name: string): React.CSSProperties =>
  animated ? { animationName: name } : {};

function Bit({ className = "", base = SKELETON, style }: { className?: string; base?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-[2px] ${className}`} style={{ backgroundColor: base, ...style }} />;
}

// Điện thoại 9:19 theo chiều cao khung. 3 bố cục khác nhau cho 3 phương án.
// right = vị trí tính từ mép phải khung Hi-fi; C là chỗ của bản cuối.
const PHONE_RIGHT = ["65%", "33%", "1%"];

function Phone({ variant, animated }: { variant: 0 | 1 | 2; animated: boolean }) {
  const step = animated ? "pc-anim pc-step" : "";
  const label = "ABC"[variant];
  // Khung ngoài giữ chỗ; thân máy mờ đi khi bị loại, còn dấu ✕ nằm ngoài
  // thân máy nên vẫn rõ
  return (
    <div className="absolute bottom-[2%] aspect-[9/19] h-[74%]" style={{ right: PHONE_RIGHT[variant] }}>
      <div
        className={`absolute inset-0 flex flex-col gap-[4%] rounded-[12%/6%] border-2 border-ink bg-white px-[9%] pb-[10%] pt-[8%] outline-2 outline-offset-2 outline-transparent ${
          variant < 2 ? "opacity-0" : ""
        } ${step}`}
        style={anim(animated, `pc-v-${variant}`)}
      >
        {animated && (
          <span className="absolute bottom-full left-0 mb-1 text-[11px] font-semibold leading-none text-white">{label}</span>
        )}
        <span className="mx-auto h-[2.5%] w-[35%] shrink-0 rounded-full bg-ink" />
        {variant === 0 && (
          <>
            <Bit className="h-[7%] shrink-0 !rounded-full" />
            <Bit base={CTA_SOFT} className="h-[8%] shrink-0 !rounded-full" />
            <Bit className="h-[26%] shrink-0" />
            <Bit className="h-[4%] w-[85%] shrink-0" />
            <Bit className="h-[4%] w-[60%] shrink-0" />
          </>
        )}
        {variant === 1 && (
          <>
            <Bit className="h-[40%] shrink-0" />
            <Bit className="h-[4%] w-[80%] shrink-0" />
            <Bit className="h-[4%] w-[55%] shrink-0" />
            <Bit base={CTA_SOFT} className="h-[8%] shrink-0 !rounded-full" />
          </>
        )}
        {variant === 2 && (
          <>
            <Bit className="h-[7%] shrink-0 !rounded-full" />
            <Bit className="h-[26%] shrink-0" />
            <Bit className="h-[4%] w-[85%] shrink-0" />
            <Bit className="h-[4%] w-[60%] shrink-0" />
            <Bit className="h-[4%] w-[75%] shrink-0" />
            {/* CTA: style gốc ở vùng ngón cái; khi chạy, Bin kéo nó từ giữa màn xuống */}
            <Bit
              base={PILL_AFTER}
              className={`absolute bottom-[8%] left-[9%] right-[9%] h-[8%] !rounded-full ${step}`}
              style={anim(animated, "pc-cta")}
            />
          </>
        )}
      </div>
      {animated && variant < 2 && (
        <span
          className={`absolute inset-0 flex items-center justify-center opacity-0 ${step}`}
          style={anim(true, `pc-x-${variant}`)}
        >
          <span className="rounded bg-ink px-1.5 py-1 text-[11px] font-semibold leading-none text-white">✕</span>
        </span>
      )}
    </div>
  );
}

function SkeletonScreens({ animated }: { animated: boolean }) {
  const step = animated ? "pc-anim pc-step" : "";
  return (
    <div className="relative h-full">
      {/* Web — bản Bin đã thiết kế */}
      <div className="absolute left-0 top-0 flex h-[88%] w-[80%] flex-col overflow-hidden rounded-md bg-white">
        <div className="flex h-[13%] items-center gap-[3%] border-b border-neutral-100 px-[3%]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6159]" />
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffbd2e]" />
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#28c941]" />
          <Bit className="ml-[4%] h-[45%] flex-1 !rounded-full" />
          <Bit className="aspect-square h-[55%] !rounded-full" />
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-[22%] flex-col gap-[8%] border-r border-neutral-100 p-[4%]">
            {/* Nút chính — AI đổi theo CTA Bin vừa chốt ở bản mobile */}
            <Bit
              base={PILL_AFTER}
              className={`h-[12%] w-[75%] !rounded-full outline-[1.5px] outline-offset-2 outline-dashed outline-transparent ${step}`}
              style={anim(animated, "pc-pill")}
            />
            <Bit className="h-[6%]" />
            <Bit className="h-[6%] w-[80%]" />
            <Bit className="h-[6%] w-[65%]" />
            <Bit className="h-[6%] w-[75%]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[5%] p-[4%]">
            <Bit className="h-[5%] w-[28%]" />
            <div className="grid h-[34%] grid-cols-3 gap-[4%]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-[10%] rounded-[3px] border border-neutral-100 p-[6%]">
                  <Bit className="flex-1" />
                  <Bit className="h-[12%] w-[70%]" />
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              {["#e24b4a", "#ef9f27", "#1d9e75", "#7f77dd"].map((dot) => (
                <div key={dot} className="flex h-[16%] items-center gap-[3%]">
                  <Bit base={dot} className="aspect-[5/4] h-full" />
                  <Bit className="h-[70%] flex-1" />
                  <Bit className="h-[70%] w-[20%]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile — AI dựng 3 phương án, Bin chọn C (C là bản cuối) */}
      {animated && <Phone variant={0} animated />}
      {animated && <Phone variant={1} animated />}
      <Phone variant={2} animated={animated} />

      {/* Bin duyệt — trạng thái gốc là "đã duyệt" (khung tĩnh / mobile) */}
      <div
        className={`absolute right-[1%] top-[3%] z-10 rounded-md bg-white px-1.5 py-1 text-[11px] font-semibold leading-none text-brand shadow-sm ${step}`}
        style={anim(animated, "pc-chip")}
      >
        <span className={`block whitespace-nowrap ${step}`} style={anim(animated, "pc-chip-after")}>
          ✓ Approved by Bin
        </span>
        {animated && (
          <span
            className={`absolute inset-0 flex items-center justify-center opacity-0 ${step}`}
            style={anim(true, "pc-chip-before")}
          >
            <span className={`rounded bg-brand px-1.5 py-0.5 text-white ${step}`} style={anim(true, "pc-press")}>
              Approve
            </span>
          </span>
        )}
      </div>

      {animated && (
        <>
          {/* Brief Bin gõ cho AI — cụ thể, có ràng buộc */}
          <div
            className={`absolute bottom-[4%] left-[3%] flex items-center gap-1.5 rounded-md border border-brand/20 bg-white py-1 pl-2 pr-1 text-[11px] font-semibold leading-none text-brand shadow-sm opacity-0 ${step}`}
            style={anim(true, "pc-prompt")}
          >
            <span aria-hidden="true">✦</span>
            <span className={`whitespace-nowrap ${step}`} style={anim(true, "pc-typing")}>
              Mobile · one-hand · our DS
            </span>
            <span className={`rounded px-1 py-0.5 text-white ${step}`} style={anim(true, "pc-enter")}>
              ↵
            </span>
          </div>

          {/* AI làm theo: áp sửa của Bin sang bản web */}
          <span
            className={`absolute left-[21%] top-[12%] whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-ink opacity-0 ${step}`}
            style={anim(true, "pc-applied")}
          >
            ✦ Applied to web
          </span>
        </>
      )}
    </div>
  );
}

function HiFiFrame({
  study,
  className = "",
  animated = false,
  hidden = false,
}: {
  study: HeroStudy | null;
  className?: string;
  animated?: boolean;
  // Đang chờ bầy con trỏ dựng (swarm-intro.tsx)
  hidden?: boolean;
}) {
  const body = (
    <div
      className={`relative h-full rounded-md outline-2 outline-offset-4 outline-transparent transition-transform duration-300 ease-out ${
        animated ? "pc-anim pc-hifi" : ""
      } ${study ? "group-hover:-translate-y-1" : ""}`}
    >
      <SkeletonScreens animated={animated} />
    </div>
  );

  // Cue "View case study →" luôn hiện trên dòng nhãn (trước chỉ hiện khi
  // hover, nên không ai biết frame bấm được — và trên mobile thì không bao
  // giờ thấy). Cả nhãn lẫn frame nằm trong 1 link.
  const label = (
    <div className="flex items-baseline justify-between gap-3">
      <FrameLabel className="min-w-0 truncate">Hi-fi{study ? ` · ${study.title}` : ""}</FrameLabel>
      {study && (
        <span className="mb-1.5 whitespace-nowrap text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 transition group-hover:decoration-white">
          Case study →
        </span>
      )}
    </div>
  );

  return study ? (
    <Link
      href={study.href}
      aria-label={`${study.title} — case study`}
      data-hidden={hidden}
      className={`sw-part group flex flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${className}`}
    >
      {label}
      <div data-sw-box="hifi" className="min-h-0 flex-1">{body}</div>
    </Link>
  ) : (
    <div data-hidden={hidden} className={`sw-part flex flex-col ${className}`}>
      {label}
      <div data-sw-box="hifi" className="min-h-0 flex-1">{body}</div>
    </div>
  );
}

// Tablet/desktop: đủ 3 frame + 2 con trỏ chuyển động
export function ProcessCanvas({ study }: { study: HeroStudy | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Mở màn bầy con trỏ: "pending" lúc render server/hydrate (khung ẩn, vòng
  // câu chuyện đứng ở 0), "running" khi bầy đang dựng, "done" khi vòng chạy.
  const [intro, setIntro] = useState<"pending" | "running" | "done">("pending");
  const [built, setBuilt] = useState<ReadonlySet<SwarmPart>>(() => new Set());
  // Bầy đã chạy thì vòng câu chuyện vào luôn, không chờ 2.8s như cũ
  const [handedOff, setHandedOff] = useState(false);

  // Chạy 1 lần mỗi phiên (quay lại trang chủ không phải xem lại); ?swarm=1
  // ép chạy lại. Bỏ qua khi giảm chuyển động hoặc canvas bị ẩn (màn nhỏ).
  useEffect(() => {
    const el = ref.current;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SWARM_SEEN_KEY) === "1";
    } catch {}
    const force = new URLSearchParams(window.location.search).has("swarm");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIntro(!el?.offsetWidth || reduce || (seen && !force) ? "done" : "running");
  }, []);

  const reveal = useCallback((part: SwarmPart) => {
    setBuilt((prev) => new Set(prev).add(part));
  }, []);
  const finishIntro = useCallback(() => {
    setIntro("done");
    setHandedOff(true);
    try {
      sessionStorage.setItem(SWARM_SEEN_KEY, "1");
    } catch {}
  }, []);
  const hide = (part: SwarmPart) => intro !== "done" && !built.has(part);

  // Dừng chuyển động khi hero cuộn khỏi màn hình — tiết kiệm pin/CPU
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-paused={paused || intro !== "done"}
      data-intro={intro !== "done" ? "on" : undefined}
      className="relative aspect-[4/3] w-full"
      style={{ "--pc-loop": `${PLAYBACK_SECONDS}s`, ...(handedOff && { "--pc-delay": "0s" }) } as React.CSSProperties}
    >
      {/* Đường nối Research → Wireframe → Hi-fi */}
      <svg
        aria-hidden="true"
        data-hidden={hide("wire")}
        className="sw-part pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        <path d="M80 124 C 80 146, 96 140, 96 160" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <path d="M168 222 C 200 222, 232 226, 232 214" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Lệnh đi từ brief của Bin sang AI */}
      <svg
        aria-hidden="true"
        className="pc-anim pc-step pointer-events-none absolute inset-0 z-10 h-full w-full opacity-0"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ animationName: "pc-link" }}
      >
        <path d="M71 67 C 73 72, 75 74, 75.5 79" fill="none" stroke="#00ddff" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        aria-hidden="true"
        className="pc-anim pc-step absolute left-[73%] top-[88%] z-20 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-ink opacity-0"
        style={{ animationName: "pc-opts" }}
      >
        ✦ 3 options
      </span>

      {/* Research */}
      <div aria-hidden="true" data-hidden={hide("research")} className="sw-part absolute left-[2%] top-[4%] flex h-[36%] w-[36%] flex-col">
        <FrameLabel>Research</FrameLabel>
        <div data-sw-box="research" className="grid flex-1 grid-cols-3 grid-rows-2 gap-1.5 rounded-md border border-dashed border-white/60 bg-white/10 p-2">
          {[0, 1, 2, 3, 4, 5].map((i) =>
            PICKED_NOTES.includes(i) ? (
              // Wrapper giữ ẩn/hiện của mở màn, note bên trong giữ keyframes tô màu
              <div key={i} data-sw-note data-hidden={hide(`note-${i}`)} className="sw-part flex">
                <div
                  className="pc-anim pc-step flex-1 rounded-sm bg-amber-300 outline-2 outline-offset-1 outline-white"
                  style={{ animationName: `pc-hl-${i}` }}
                />
              </div>
            ) : (
              <div key={i} data-sw-note data-hidden={hide(`note-${i}`)} className="sw-part rounded-sm bg-amber-100" />
            )
          )}
        </div>
        {/* Insight Bin rút ra từ 2 note đã tô */}
        <span className="pc-anim pc-step absolute left-0 top-full mt-1.5 whitespace-nowrap rounded bg-white px-1.5 py-1 text-[11px] font-semibold leading-none text-brand" style={{ animationName: "pc-insight" }}>
          <span className="pc-anim pc-step block" style={{ animationName: "pc-insight-type" }}>
            Insight · drop-off at step 3
          </span>
        </span>
      </div>

      {/* Wireframe */}
      <div aria-hidden="true" data-hidden={hide("wire")} className="sw-part absolute left-[6%] top-[54%] flex h-[38%] w-[36%] flex-col">
        <FrameLabel>Wireframe</FrameLabel>
        <div data-sw-box="wire" className="pc-anim pc-wire flex flex-1 flex-col gap-1.5 rounded-md bg-white p-2.5">
          <div className="h-2.5 w-1/2 rounded-sm border border-dashed border-neutral-400" />
          <div className="flex-1 rounded-sm border border-dashed border-neutral-400" />
          <div className="flex gap-1.5">
            <div className="h-3 flex-1 rounded-sm border border-dashed border-neutral-400" />
            <div className="h-3 flex-1 rounded-sm border border-dashed border-neutral-400" />
          </div>
        </div>
      </div>

      {/* Hi-fi — link thật tới case study mới nhất */}
      <HiFiFrame study={study} animated hidden={hide("hifi")} className="absolute left-[46%] top-[8%] h-[62%] w-[52%]" />
      <style>{STORY_KEYFRAMES}</style>

      <Cursor label="Bin" tone={BIN_TONE} className="pc-anim pc-cursor-bin" style={{ left: "91%", top: "21%" }} />
      <Cursor label="AI" tone={AI_TONE} className="pc-anim pc-cursor-ai" style={{ left: "49%", top: "21%" }} />

      {intro === "running" && <SwarmIntro bin={BIN_HOME} ai={AI_HOME} onReveal={reveal} onDone={finishIntro} />}
    </div>
  );
}

// Mobile: chỉ frame Hi-fi (đã duyệt) + con trỏ Bin đứng yên — màn nhỏ có chuyển động dễ rối
export function ProcessCanvasCompact({ study }: { study: HeroStudy | null }) {
  return (
    <div className="relative">
      <HiFiFrame study={study} className="aspect-[16/10] w-full" />
      <Cursor label="Bin" tone={BIN_TONE} style={{ right: "18%", bottom: "-6px" }} />
    </div>
  );
}
