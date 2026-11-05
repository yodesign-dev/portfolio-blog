"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AI_TONE, BIN_TONE, Cursor } from "@/components/originkit/ui/hero-31/cursor";
import { SwarmIntro, type SwarmPart } from "@/components/originkit/ui/hero-31/swarm-intro";

// Canvas "người × AI" ở hero: 3 frame Research → Wireframe → Hi-fi kiểu
// Figma, 2 con trỏ "Bin" và "AI" cùng làm việc rồi gặp nhau ở Hi-fi, nơi
// Bin ra lệnh bằng prompt, AI dựng bản mobile, AI review, Bin quyết.
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

function FrameLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-1.5 text-xs font-semibold tracking-wide text-white/85 ${className}`}>{children}</p>;
}

// ---------- Câu chuyện ở khung Hi-fi: "người ra lệnh, AI làm, AI review, người quyết" ----------
//
// Kịch bản viết trên thang 18 "giây" (cộng 2.8s chờ đầu) rồi đổi sang % keyframes;
// thời lượng phát thật là PLAYBACK_SECONDS (hiện 15s, nhanh hơn ~1.2 lần):
//   0–4.5s    AI lướt các sticky note ở Research
//   4.5–7.3s  Bin phác Wireframe
//   8.4–9.6s  Bin gõ prompt "Make it mobile" rồi Enter
//   9.8–11.8s AI "Generating…", dựng bản mobile từng khối (loé cyan)
//   12.2–13s  AI ghim nhận xét "Contrast 3.1:1" lên nút New của bản web
//   13.8s     Bin bấm Accept → nút đổi sang màu brand, nhận xét thành "✓ Fixed"
//   16.2–18s  Hai con trỏ quay về, mọi thứ reset
// Keyframes của Research/Wireframe/viền Hi-fi nằm trong hero-31.css (cùng 18s).
export const LOOP_SECONDS = 18;
// Thời lượng phát thật của 1 vòng — nhỏ hơn 18 là nhanh hơn, mọi bước co giãn theo
const PLAYBACK_SECONDS = 15;
const pct = (sec: number) => +((sec / LOOP_SECONDS) * 100).toFixed(2);
const keyframes = (name: string, stops: [number, string][]) =>
  `@keyframes ${name}{${stops.map(([sec, css]) => `${pct(sec)}%{${css}}`).join("")}}`;
const at = (left: number, top: number) => `left:${left}%;top:${top}%`;
// Chỗ đứng đầu vòng của 2 con trỏ — đoạn mở màn bầy con trỏ thu về đúng đây
const AI_HOME = { x: 40, y: 46 };
const SWARM_SEEN_KEY = "hero-swarm-seen";
const BIN_HOME = { x: 2, y: 90 };

const SKELETON = "#e9ecf2";
const AI_FLASH = "#a5f3fc";
const PILL_BEFORE = "#dfe7ff";
const PILL_AFTER = "#1d3fff";
const RESET = 16.2; // bắt đầu reset
const GONE = 16.9;

// Khối mobile AI dựng lần lượt
const MOBILE_STEPS = [9.9, 10.3, 10.7, 11.1, 11.5];

const STORY_KEYFRAMES = [
  keyframes("pc-ai", [
    [0, at(AI_HOME.x, AI_HOME.y)],
    [0.84, at(9, 18)],
    [1.68, at(20, 18)],
    [2.52, at(31, 18)],
    [3.36, at(20, 30)],
    [4.48, at(40, 46)],
    [7.28, at(40, 46)],
    [8.4, at(91, 32)],
    [9.8, at(91, 32)],
    [10.0, at(90, 37)],
    [10.4, at(91, 43)],
    [10.8, at(89, 48)],
    [11.2, at(91, 52)],
    [11.6, at(90, 60)],
    [12.2, at(50, 26)],
    [12.8, at(50, 26)],
    [13.4, at(55, 32)],
    [RESET, at(55, 32)],
    [18, at(AI_HOME.x, AI_HOME.y)],
  ]),
  keyframes("pc-bin", [
    [0, at(BIN_HOME.x, BIN_HOME.y)],
    [4.48, at(2, 90)],
    [5.6, at(12, 66)],
    [6.44, at(34, 72)],
    [7.28, at(18, 84)],
    [8.4, at(54, 66)],
    [9.4, at(62, 66)],
    [9.6, at(67, 65.5)],
    [9.9, at(67, 65.5)],
    [10.5, at(66, 50)],
    [13.2, at(66, 50)],
    [13.8, at(80.5, 26.5)],
    [14.3, at(80.5, 26.5)],
    [14.9, at(70, 42)],
    [RESET, at(70, 42)],
    [18, at(BIN_HOME.x, BIN_HOME.y)],
  ]),
  ...MOBILE_STEPS.map((sec, i) =>
    keyframes(`pc-m-${i}`, [
      [0, "opacity:.14;transform:scale(.94);background-color:var(--pc-base)"],
      [sec, "opacity:.14;transform:scale(.94);background-color:var(--pc-base)"],
      [sec + 0.2, `opacity:1;transform:scale(1.05);background-color:${AI_FLASH}`],
      [sec + 0.7, "opacity:1;transform:scale(1);background-color:var(--pc-base)"],
      [RESET, "opacity:1;transform:scale(1);background-color:var(--pc-base)"],
      [GONE, "opacity:.14;transform:scale(.94);background-color:var(--pc-base)"],
      [18, "opacity:.14;transform:scale(.94);background-color:var(--pc-base)"],
    ])
  ),
  // Ô prompt của Bin: hiện → chữ gõ dần → Enter loé → ẩn
  keyframes("pc-prompt", [
    [0, "opacity:0;transform:translateY(4px)"],
    [8.4, "opacity:0;transform:translateY(4px)"],
    [8.6, "opacity:1;transform:translateY(0)"],
    [10.1, "opacity:1;transform:translateY(0)"],
    [10.4, "opacity:0;transform:translateY(4px)"],
    [18, "opacity:0;transform:translateY(4px)"],
  ]),
  keyframes("pc-typing", [
    [0, "clip-path:inset(0 100% 0 0)"],
    [8.7, "clip-path:inset(0 100% 0 0)"],
    [9.45, "clip-path:inset(0 0 0 0)"],
    [18, "clip-path:inset(0 0 0 0)"],
  ]),
  keyframes("pc-enter", [
    [0, "transform:scale(1);background-color:#0f2bff"],
    [9.55, "transform:scale(1);background-color:#0f2bff"],
    [9.65, "transform:scale(.8);background-color:#00ddff"],
    [9.9, "transform:scale(1);background-color:#0f2bff"],
    [18, "transform:scale(1);background-color:#0f2bff"],
  ]),
  // Nhãn "Generating…" trên điện thoại
  keyframes("pc-gen", [
    [0, "opacity:0"],
    [9.75, "opacity:0"],
    [9.9, "opacity:1"],
    [11.7, "opacity:1"],
    [11.9, "opacity:0"],
    [18, "opacity:0"],
  ]),
  // Nhận xét của AI: hiện → Accept bấm → thành "Fixed" → ẩn
  keyframes("pc-note-pop", [
    [0, "opacity:0;transform:scale(.85)"],
    [12.5, "opacity:0;transform:scale(.85)"],
    [12.7, "opacity:1;transform:scale(1.04)"],
    [12.9, "opacity:1;transform:scale(1)"],
    [15.1, "opacity:1;transform:scale(1)"],
    [15.4, "opacity:0;transform:scale(.9)"],
    [18, "opacity:0;transform:scale(.85)"],
  ]),
  keyframes("pc-note-before", [
    [0, "opacity:1"],
    [14.0, "opacity:1"],
    [14.15, "opacity:0"],
    [18, "opacity:0"],
  ]),
  keyframes("pc-note-after", [
    [0, "opacity:0"],
    [14.1, "opacity:0"],
    [14.3, "opacity:1"],
    [18, "opacity:1"],
  ]),
  keyframes("pc-accept", [
    [0, "transform:scale(1)"],
    [13.85, "transform:scale(1)"],
    [13.95, "transform:scale(.85)"],
    [14.1, "transform:scale(1)"],
    [18, "transform:scale(1)"],
  ]),
  // Nút "New" của bản web: bị AI đánh dấu → Bin chấp nhận → đổi màu brand
  keyframes("pc-pill", [
    [0, `background-color:${PILL_BEFORE};outline-color:transparent`],
    [12.6, `background-color:${PILL_BEFORE};outline-color:transparent`],
    [12.7, `background-color:${PILL_BEFORE};outline-color:#00ddff`],
    [14.0, `background-color:${PILL_BEFORE};outline-color:#00ddff`],
    [14.2, `background-color:${PILL_AFTER};outline-color:transparent`],
    [RESET, `background-color:${PILL_AFTER};outline-color:transparent`],
    [GONE, `background-color:${PILL_BEFORE};outline-color:transparent`],
    [18, `background-color:${PILL_BEFORE};outline-color:transparent`],
  ]),
].join("");

const anim = (animated: boolean, name: string): React.CSSProperties =>
  animated ? { animationName: name } : {};

function Bit({ className = "", base = SKELETON, style }: { className?: string; base?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[2px] ${className}`}
      style={{ backgroundColor: base, "--pc-base": base, ...style } as React.CSSProperties}
    />
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
            {/* Nút "New" — chỗ AI phát hiện tương phản thấp */}
            <Bit
              base={animated ? PILL_BEFORE : PILL_AFTER}
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

      {/* Mobile — AI dựng theo prompt */}
      {/* Giữ đúng tỉ lệ điện thoại (9:19) theo chiều cao, không kéo giãn theo khung */}
      <div className="absolute bottom-[2%] right-[1%] flex aspect-[9/19] h-[74%] flex-col gap-[4%] rounded-[12%/6%] border-2 border-ink bg-white px-[9%] pb-[10%] pt-[8%]">
        <span className="mx-auto h-[2.5%] w-[35%] shrink-0 rounded-full bg-ink" />
        <Bit className={`h-[7%] shrink-0 !rounded-full ${step}`} style={anim(animated, "pc-m-0")} />
        <Bit className={`h-[26%] shrink-0 ${step}`} style={anim(animated, "pc-m-1")} />
        <Bit className={`h-[4%] w-[85%] shrink-0 ${step}`} style={anim(animated, "pc-m-2")} />
        <Bit className={`h-[4%] w-[60%] shrink-0 ${step}`} style={anim(animated, "pc-m-2")} />
        <Bit className={`h-[4%] w-[75%] shrink-0 ${step}`} style={anim(animated, "pc-m-3")} />
        <Bit className={`h-[4%] w-[50%] shrink-0 ${step}`} style={anim(animated, "pc-m-3")} />
        <Bit base="#bfcbff" className={`mt-auto h-[9%] shrink-0 !rounded-full ${step}`} style={anim(animated, "pc-m-4")} />
      </div>

      {animated && (
        <>
          {/* AI đang tạo bản mobile */}
          <span
            className={`absolute right-[3%] top-[6%] whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-ink opacity-0 ${step}`}
            style={anim(true, "pc-gen")}
          >
            ✦ Generating…
          </span>

          {/* Prompt Bin gõ cho AI */}
          <div
            className={`absolute bottom-[4%] left-[3%] flex items-center gap-1.5 rounded-md border border-brand/20 bg-white py-1 pl-2 pr-1 text-[11px] font-semibold leading-none text-brand shadow-sm opacity-0 ${step}`}
            style={anim(true, "pc-prompt")}
          >
            <span aria-hidden="true">✦</span>
            <span className={`whitespace-nowrap ${step}`} style={anim(true, "pc-typing")}>
              Make it mobile
            </span>
            <span className={`rounded px-1 py-0.5 text-white ${step}`} style={anim(true, "pc-enter")}>
              ↵
            </span>
          </div>

          {/* Nhận xét AI ghim lên nút New */}
          <div
            className={`absolute left-[21%] top-[12%] origin-top-left rounded-md bg-accent p-1 text-[11px] font-semibold leading-none text-ink shadow-sm opacity-0 ${step}`}
            style={anim(true, "pc-note-pop")}
          >
            <div className="relative">
              <div className={`flex items-center gap-1.5 whitespace-nowrap ${step}`} style={anim(true, "pc-note-before")}>
                <span className="pl-0.5">Contrast 3.1:1</span>
                <span className={`rounded bg-ink px-1 py-0.5 text-white ${step}`} style={anim(true, "pc-accept")}>
                  Accept
                </span>
              </div>
              <div
                className={`absolute inset-0 flex items-center whitespace-nowrap pl-0.5 opacity-0 ${step}`}
                style={anim(true, "pc-note-after")}
              >
                ✓ Fixed · 7.2:1
              </div>
            </div>
          </div>
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

      {/* Research */}
      <div aria-hidden="true" data-hidden={hide("research")} className="sw-part absolute left-[2%] top-[4%] flex h-[36%] w-[36%] flex-col">
        <FrameLabel>Research</FrameLabel>
        <div data-sw-box="research" className="grid flex-1 grid-cols-3 grid-rows-2 gap-1.5 rounded-md border border-dashed border-white/60 bg-white/10 p-2">
          {NOTES.map((note) => (
            <div
              key={note.i}
              data-sw-note
              data-hidden={hide(`note-${note.i}`)}
              className={`sw-part rounded-sm bg-amber-100 ${note.visited ? "pc-anim pc-note" : ""}`}
              style={note.visited ? ({ "--pc-i": note.i === 4 ? 3 : note.i } as React.CSSProperties) : undefined}
            />
          ))}
        </div>
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

      <Cursor label="Bin" tone={BIN_TONE} className="pc-anim pc-cursor-bin" style={{ left: "70%", top: "42%" }} />
      <Cursor label="AI" tone={AI_TONE} className="pc-anim pc-cursor-ai" style={{ left: "55%", top: "32%" }} />

      {intro === "running" && <SwarmIntro bin={BIN_HOME} ai={AI_HOME} onReveal={reveal} onDone={finishIntro} />}
    </div>
  );
}

// Mobile: chỉ frame Hi-fi + con trỏ AI đứng yên — màn nhỏ có chuyển động dễ rối
export function ProcessCanvasCompact({ study }: { study: HeroStudy | null }) {
  return (
    <div className="relative">
      <HiFiFrame study={study} className="aspect-[16/10] w-full" />
      <Cursor label="AI" tone={AI_TONE} style={{ right: "18%", bottom: "-6px" }} />
    </div>
  );
}
