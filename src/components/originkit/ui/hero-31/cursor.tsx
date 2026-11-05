import type { CSSProperties, Ref } from "react";

// Con trỏ kiểu Figma multiplayer: mũi tên + nhãn tên. Dùng chung cho vòng câu
// chuyện Bin × AI (process-canvas.tsx) và đoạn mở màn bầy con trỏ
// (swarm-intro.tsx) — hai bên phải trông y hệt để lúc bàn giao không bị giật.

export type CursorTone = {
  fill: string;
  // Lớp màu cho nhãn; nhãn agent không có màu trong theme thì dùng chipStyle
  chipClassName?: string;
  chipStyle?: CSSProperties;
};

export const BIN_TONE: CursorTone = { fill: "#ffffff", chipClassName: "bg-white text-brand" };
export const AI_TONE: CursorTone = { fill: "#00ddff", chipClassName: "bg-accent text-ink" };

export function Cursor({
  label,
  tone,
  className = "",
  style,
  ref,
}: {
  label: string;
  tone: CursorTone;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={`pointer-events-none absolute z-20 ${className}`} style={style}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2 1.5 L15 8.2 L9 9.6 L6.4 15.5 Z" fill={tone.fill} stroke="#0b1432" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span
        className={`ml-3 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
          tone.chipClassName ?? "text-ink"
        }`}
        style={tone.chipStyle}
      >
        {label}
      </span>
    </div>
  );
}
