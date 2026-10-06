// Emoji động Noto Animated Emoji (Google, CC BY 4.0 — ghi nguồn ở cuối bảng cài đặt).
// Chỉ 16 cái hợp không khí quán, thu nhỏ còn 48 px (public/chill/emoji/<mã>.webp, kèm
// <mã>-still.webp cho người bật giảm chuyển động). Emoji ngoài bộ này vẫn hiện bằng
// emoji của hệ điều hành như cũ.

import type {ReactNode} from 'react'

export const NOTO = [
  {char: '☕', code: '2615'},
  {char: '😎', code: '1f60e'},
  {char: '🌧️', code: '1f327_fe0f'},
  {char: '🐱', code: '1f431'},
  {char: '❤️', code: '2764_fe0f'},
  {char: '😂', code: '1f602'},
  {char: '👋', code: '1f44b'},
  {char: '🔥', code: '1f525'},
  {char: '😊', code: '1f60a'},
  {char: '🥰', code: '1f970'},
  {char: '😴', code: '1f634'},
  {char: '😌', code: '1f60c'},
  {char: '🤔', code: '1f914'},
  {char: '👏', code: '1f44f'},
  {char: '🎉', code: '1f389'},
  {char: '✨', code: '2728'},
] as const

// So khớp bỏ qua ký tự biến thể U+FE0F (bàn phím có lúc gõ "❤" không kèm FE0F)
const bare = (s: string) => s.replace(/️/g, '')
const CODE_OF = new Map<string, string>(NOTO.map((e) => [bare(e.char), e.code]))
const PATTERN = new RegExp(`(${NOTO.map((e) => bare(e.char)).join('|')})\\uFE0F?`, 'gu')

export function NotoEmoji({char, size = 20, className = ''}: {char: string; size?: number; className?: string}) {
  const code = CODE_OF.get(bare(char))
  if (!code) return <span className={className}>{char}</span>
  return (
    <picture className={`inline-flex shrink-0 ${className}`}>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`/chill/emoji/${code}-still.webp`} />
      <img
        src={`/chill/emoji/${code}.webp`}
        alt={char}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{width: size, height: size}}
      />
    </picture>
  )
}

// Thay emoji trong bộ 16 bằng ảnh động, phần chữ giữ nguyên (dùng cho tin nhắn chat)
export function withNoto(text: string, size = 20): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    out.push(<NotoEmoji key={i} char={m[1]} size={size} className="mx-px align-[-0.25em]" />)
    last = i + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
