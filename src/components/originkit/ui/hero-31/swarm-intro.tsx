"use client";

import { useEffect, useRef } from "react";
import { AI_TONE, BIN_TONE, Cursor, type CursorTone } from "@/components/originkit/ui/hero-31/cursor";

// Mở màn bầy con trỏ cho canvas ở hero: canvas trống, ~9 con trỏ (Bin, AI và
// 7 agent) bay lên thành bầy, kéo đường gióng, kéo khung có nhãn W × H để dựng
// Research / Wireframe / Hi-fi (Bin dựng khung Hi-fi), chạm thả từng sticky
// note, rồi cả bầy thu về đúng chỗ đứng đầu vòng câu chuyện Bin × AI — vòng
// đó chạy tiếp ngay.
//
// Ý tưởng lấy cảm hứng từ Swarm của Joel Califa (califa.github.io/swarm-site);
// code viết mới hoàn toàn, không chép từ Swarm hay swarm-cursors (cả hai đều
// không có giấy phép).
//
// Chuyển động: mỗi con trỏ là một lò xo đuổi theo điểm đích do kịch bản đưa ra
// theo thời gian (lò xo mềm lúc bay bầy, cứng lúc kéo khung để góc khung dính
// theo mũi trỏ). Cập nhật thẳng style trong requestAnimationFrame, không
// re-render React mỗi khung hình. Tọa độ tính theo % khung canvas.

type Pt = { x: number; y: number };
type Box = Pt & { w: number; h: number };
export type SwarmFrame = "research" | "wire" | "hifi";
export type SwarmPart = SwarmFrame | `note-${number}`;

const agentTone = (fill: string): CursorTone => ({ fill, chipStyle: { backgroundColor: fill } });

const BIN = 0;
const AI = 1;
const RESEARCH = 2;
const GRID = 3;
const A11Y = 4;
const COPY = 5;
const QA = 6;
const MOTION = 7;
const LAYOUT = 8;

const AGENTS: { label: string; tone: CursorTone }[] = [
  { label: "Bin", tone: BIN_TONE },
  { label: "AI", tone: AI_TONE },
  { label: "Research", tone: agentTone("#fcd34d") },
  { label: "Grid", tone: agentTone("#ff8a8a") },
  { label: "a11y", tone: agentTone("#bef264") },
  { label: "Copy", tone: agentTone("#f9a8d4") },
  { label: "QA", tone: agentTone("#fdba74") },
  { label: "Motion", tone: agentTone("#c4b5fd") },
  { label: "Layout", tone: agentTone("#6ee7b7") },
];

// Cuối màn, agent nhập vào con trỏ nào (gần chỗ đứng đầu vòng: Bin cạnh
// Research, AI dưới khung Hi-fi)
const LEADER = [BIN, AI, BIN, AI, BIN, BIN, AI, BIN, AI];

// ---------- Kịch bản (giây) ----------
const FLOCK_END = 0.85; // bay bầy xong, toả ra làm việc
const NOTE_START = 1.65;
const NOTE_GAP = 0.12;
const NOTE_AGENTS = [A11Y, COPY, QA, MOTION, AI, GRID];
const GATHER = 2.45; // thu bầy về Bin / AI
const END = 3.15;
const GUIDE_COLOR = "#ff8a8a";

// Bin dựng khung chính (Hi-fi); agent lo khung phụ, AI chỉ thả note
const DRAGS: { key: SwarmFrame; who: number; start: number; end: number }[] = [
  { key: "research", who: RESEARCH, start: 1.1, end: 1.55 },
  { key: "hifi", who: BIN, start: 1.3, end: 1.75 },
  { key: "wire", who: LAYOUT, start: 1.45, end: 1.9 },
];

type Geometry = { frames: Record<SwarmFrame, Box>; notes: Pt[] };
type Job = { start: number; end: number; from: Pt; to: Pt };
type Guide = { who: number; axis: "x" | "y"; job: Job };

const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function buildPlan(g: Geometry) {
  const jobs: Job[][] = AGENTS.map(() => []);
  const { wire, hifi } = g.frames;

  // Đường gióng: dọc ở mép trái Hi-fi, ngang ở mép trên Wireframe — kéo trước
  // khi khung được vẽ, rồi khung "bám" vào.
  const guides: Guide[] = [
    {
      who: GRID,
      axis: "x",
      job: { start: 0.9, end: 1.25, from: { x: hifi.x - 16, y: 96 }, to: { x: hifi.x, y: 96 } },
    },
    {
      who: LAYOUT,
      axis: "y",
      job: {
        start: 1.0,
        end: 1.35,
        from: { x: (wire.x + wire.w + hifi.x) / 2, y: wire.y + 22 },
        to: { x: (wire.x + wire.w + hifi.x) / 2, y: wire.y },
      },
    },
  ];
  for (const gd of guides) jobs[gd.who].push(gd.job);

  for (const d of DRAGS) {
    const b = g.frames[d.key];
    jobs[d.who].push({ start: d.start, end: d.end, from: { x: b.x, y: b.y }, to: { x: b.x + b.w, y: b.y + b.h } });
  }

  const reveals: { at: number; part: SwarmPart }[] = DRAGS.map((d) => ({ at: d.end, part: d.key }));
  g.notes.forEach((c, i) => {
    const at = NOTE_START + i * NOTE_GAP;
    jobs[NOTE_AGENTS[i % NOTE_AGENTS.length]].push({ start: at, end: at + 0.1, from: c, to: c });
    // Note chỉ hiện khi khung Research đã có
    reveals.push({ at: Math.max(at + 0.04, DRAGS[0].end + 0.05), part: `note-${i}` });
  });

  for (const list of jobs) list.sort((a, b) => a.start - b.start);
  reveals.sort((a, b) => a.at - b.at);
  return { jobs, guides, reveals };
}

export function SwarmIntro({
  bin,
  ai,
  onReveal,
  onDone,
}: {
  // Chỗ đứng đầu vòng câu chuyện của Bin và AI (% canvas)
  bin: Pt;
  ai: Pt;
  onReveal: (part: SwarmPart) => void;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const badgeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const guideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callbacks = useRef({ onReveal, onDone });
  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = root?.parentElement;
    if (!root || !canvas) return;

    let W = root.offsetWidth;
    let H = root.offsetHeight;
    const homes = [bin, ai];
    const homeOf = (i: number) => homes[LEADER[i]];

    // Đo vị trí thật của các khung/note (đang ẩn nhưng vẫn chiếm chỗ)
    const base = root.getBoundingClientRect();
    const toBox = (el: Element | null): Box => {
      const r = el?.getBoundingClientRect();
      if (!r || !base.width || !base.height) return { x: 0, y: 0, w: 0, h: 0 };
      return {
        x: ((r.left - base.left) / base.width) * 100,
        y: ((r.top - base.top) / base.height) * 100,
        w: (r.width / base.width) * 100,
        h: (r.height / base.height) * 100,
      };
    };
    const frames = {
      research: toBox(canvas.querySelector('[data-sw-box="research"]')),
      wire: toBox(canvas.querySelector('[data-sw-box="wire"]')),
      hifi: toBox(canvas.querySelector('[data-sw-box="hifi"]')),
    };
    const notes = Array.from(canvas.querySelectorAll("[data-sw-note]")).map((el) => {
      const b = toBox(el);
      return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    });

    // Canvas bị ẩn (màn nhỏ) hoặc chưa có kích thước → bỏ qua mở màn
    if (!W || !H || !frames.hifi.w) {
      callbacks.current.onDone();
      return;
    }

    const { jobs, guides, reveals } = buildPlan({ frames, notes });

    // Bầy xuất phát từ dưới khung canvas, toả theo hàng ngang
    const pos: Pt[] = AGENTS.map((_, i) => ({ x: 22 + i * 8 + (i % 2) * 3, y: 112 + (i % 3) * 7 }));
    const vel: Pt[] = AGENTS.map(() => ({ x: 0, y: -20 }));

    const hover = (p: Pt, t: number, i: number, r = 4): Pt => ({
      x: p.x + Math.cos(t * 2.2 + i * 0.7) * r,
      y: p.y + 5 + Math.sin(t * 2.2 + i * 0.7) * r * 0.8,
    });

    // Điểm đích + độ cứng lò xo của con trỏ i tại thời điểm t
    const aim = (i: number, t: number): { p: Pt; k: number } => {
      if (t < FLOCK_END) {
        const a = (i * Math.PI * 2) / AGENTS.length + t * 2.4;
        return { p: { x: 58 + Math.cos(a) * 18, y: 46 + Math.sin(a) * 13 }, k: 28 };
      }
      if (t >= GATHER) return { p: homeOf(i), k: i === BIN || i === AI ? 220 : 90 };
      const job = jobs[i].find((j) => j.end > t);
      if (job) {
        if (t >= job.start) return { p: lerp(job.from, job.to, easeInOut((t - job.start) / (job.end - job.start))), k: 900 };
        if (job.start - t < 0.55) return { p: job.from, k: 160 };
        return { p: hover(job.from, t, i), k: 45 };
      }
      const last = jobs[i].at(-1);
      return { p: hover(last ? last.to : homeOf(i), t, i, 3), k: 45 };
    };

    const pressed = (i: number, t: number) => jobs[i].some((j) => t >= j.start && t <= j.end);

    const step = (t: number, dt: number) => {
      for (let i = 0; i < AGENTS.length; i++) {
        const { p, k } = aim(i, t);
        const c = 2 * Math.sqrt(k) * 0.85;
        const P = pos[i];
        const V = vel[i];
        V.x += (k * (p.x - P.x) - c * V.x) * dt;
        V.y += (k * (p.y - P.y) - c * V.y) * dt;
        P.x += V.x * dt;
        P.y += V.y * dt;
      }
    };

    const px = (v: number, size: number) => `${((v * size) / 100).toFixed(1)}px`;

    const render = (t: number) => {
      for (let i = 0; i < AGENTS.length; i++) {
        const el = cursorRefs.current[i];
        if (!el) continue;
        const P = pos[i];
        let opacity = clamp01(t / 0.3);
        // AI mờ dần về 0.5 — đúng độ mờ "đang chờ lệnh" ở đầu vòng câu chuyện
        if (i === AI && t >= GATHER) opacity = Math.min(opacity, 1 - 0.5 * clamp01((t - GATHER) / 0.5));
        // Agent nhạt dần khi về tới con trỏ dẫn đầu
        if (i !== BIN && i !== AI && t >= GATHER) {
          const home = homeOf(i);
          const dist = Math.hypot(P.x - home.x, P.y - home.y);
          opacity = Math.min(opacity, clamp01(dist / 10), clamp01((END - 0.1 - t) / 0.25));
        }
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(${px(P.x, W)},${px(P.y, H)},0) scale(${pressed(i, t) ? 0.86 : 1})`;
      }

      DRAGS.forEach((d, n) => {
        const el = ghostRefs.current[n];
        const badge = badgeRefs.current[n];
        if (!el || !badge) return;
        if (t < d.start) {
          el.style.opacity = "0";
          return;
        }
        const b = frames[d.key];
        const tip = pos[d.who];
        const drawing = t < d.end;
        const w = drawing ? Math.min(b.w, Math.max(0.5, tip.x - b.x)) : b.w;
        const h = drawing ? Math.min(b.h, Math.max(0.5, tip.y - b.y)) : b.h;
        el.dataset.state = drawing ? "draw" : "select";
        el.style.left = px(b.x, W);
        el.style.top = px(b.y, H);
        el.style.width = px(w, W);
        el.style.height = px(h, H);
        el.style.opacity = clamp01(1 - (t - d.end - 0.3) / 0.25).toFixed(3);
        const text = `${Math.round((w * W) / 100)} × ${Math.round((h * H) / 100)}`;
        if (badge.textContent !== text) badge.textContent = text;
      });

      guides.forEach((g, n) => {
        const el = guideRefs.current[n];
        if (!el) return;
        const { job } = g;
        if (t < job.start) {
          el.style.opacity = "0";
          return;
        }
        const at = t < job.end ? pos[g.who][g.axis] : job.to[g.axis];
        if (g.axis === "x") el.style.transform = `translate3d(${px(at, W)},0,0)`;
        else el.style.transform = `translate3d(0,${px(at, H)},0)`;
        // Loé dày lên lúc vừa bắt dính
        const snap = t >= job.end && t < job.end + 0.18;
        el.style.boxShadow = snap ? `0 0 0 1px ${GUIDE_COLOR}` : "none";
        el.style.opacity = (0.9 * clamp01(1 - (t - GATHER) / 0.3)).toFixed(3);
      });
    };

    const observer = new ResizeObserver(() => {
      W = root.offsetWidth;
      H = root.offsetHeight;
    });
    observer.observe(root);

    // Thời gian kịch bản cộng dồn theo khung hình (kẹp 1/30s) — tab bị ẩn thì
    // dừng lại chứ không nhảy cóc.
    let t = -0.2;
    let nextReveal = 0;
    let last = 0;
    let raf = 0;
    const tick = (now: number) => {
      const dt = (last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60);
      last = now;
      // Chia nhỏ bước để lò xo cứng (k = 900) vẫn ổn định
      const subs = Math.ceil(dt / (1 / 120));
      for (let s = 0; s < subs; s++) {
        t += dt / subs;
        if (t > 0) step(t, dt / subs);
      }
      while (nextReveal < reveals.length && reveals[nextReveal].at <= t) {
        callbacks.current.onReveal(reveals[nextReveal].part);
        nextReveal++;
      }
      if (t >= END) {
        // Bàn giao: Bin và AI đứng đúng chỗ đầu vòng câu chuyện
        pos[BIN] = { ...bin };
        pos[AI] = { ...ai };
        render(END);
        callbacks.current.onDone();
        return;
      }
      render(Math.max(t, 0));
      raf = requestAnimationFrame(tick);
    };
    render(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // Chạy 1 lần khi gắn; bin/ai là hằng số của canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
      {/* 0: gióng dọc (Grid), 1: gióng ngang (Layout) — cùng thứ tự với buildPlan */}
      {[0, 1].map((n) => (
        <div
          key={n}
          ref={(el) => {
            guideRefs.current[n] = el;
          }}
          className={`absolute left-0 top-0 opacity-0 ${n === 0 ? "h-full w-px" : "h-px w-full"}`}
          style={{ backgroundColor: GUIDE_COLOR }}
        />
      ))}
      {DRAGS.map((d, n) => (
        <div
          key={d.key}
          ref={(el) => {
            ghostRefs.current[n] = el;
          }}
          data-state="draw"
          className="group absolute left-0 top-0 rounded-md border border-dashed border-white/90 bg-white/10 opacity-0 data-[state=select]:border-solid data-[state=select]:border-white data-[state=select]:bg-transparent"
        >
          {["-left-[3px] -top-[3px]", "-right-[3px] -top-[3px]", "-left-[3px] -bottom-[3px]", "-right-[3px] -bottom-[3px]"].map(
            (corner) => (
              <span
                key={corner}
                className={`absolute size-1.5 border border-brand bg-white opacity-0 group-data-[state=select]:opacity-100 ${corner}`}
              />
            )
          )}
          <span
            ref={(el) => {
              badgeRefs.current[n] = el;
            }}
            className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white tabular-nums"
          />
        </div>
      ))}
      {AGENTS.map((a, i) => (
        <Cursor
          key={a.label}
          ref={(el) => {
            cursorRefs.current[i] = el;
          }}
          label={a.label}
          tone={a.tone}
          className="left-0 top-0 origin-top-left opacity-0 will-change-transform"
        />
      ))}
    </div>
  );
}
