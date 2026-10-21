'use client'

import {useEffect, useRef, useState} from 'react'

// Mục "How I work" trang chủ — kể tiếp câu chuyện Research → Wireframe → Hi-fi
// của hero. Desktop: khung minh hoạ bên trái đứng yên (sticky), đổi hình theo
// bước đang đọc ở cột phải. Mobile: mỗi bước có hình riêng ngay trên chữ.
const STEPS = [
  {
    key: 'research',
    label: 'Research',
    title: 'Hear it from users first.',
    body: 'I run interviews and dig through surveys and support tickets. AI helps me cluster hundreds of notes into themes in an hour — then I check every theme against the raw quotes before it shapes a decision.',
    tags: ['Interviews', 'Affinity mapping', 'AI synthesis'],
  },
  {
    key: 'wireframe',
    label: 'Wireframe',
    title: 'Explore wide, then commit.',
    body: 'I sketch several flows fast, using AI to generate layout variations and the edge cases that are easy to miss. The team agrees on structure before anyone debates colour.',
    tags: ['User flows', 'Low-fi', 'Edge cases'],
  },
  {
    key: 'hifi',
    label: 'Hi-fi',
    title: 'Prototype it like it’s real.',
    body: 'Final screens built on a design system, wired into a clickable prototype for testing — and a clear handoff so engineering builds what was designed.',
    tags: ['Design system', 'Prototyping', 'Dev handoff'],
  },
] as const

type StepKey = (typeof STEPS)[number]['key']

export function HowIWork() {
  const [active, setActive] = useState(0)
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    // Bước nào chạm dải giữa màn hình thì là bước đang đọc
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      {rootMargin: '-45% 0px -45% 0px'},
    )
    stepRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section aria-labelledby="how-i-work" className="mx-auto max-w-6xl px-6 pt-24 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">How I work</p>
      <h2 id="how-i-work" className="mt-3 max-w-2xl text-balance text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        From messy research to a prototype people can click.
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-16 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <div className="@container relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand">
              <DotGrid />
              {STEPS.map((step, i) => (
                <div
                  key={step.key}
                  aria-hidden
                  className={`absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none ${
                    i === active ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.97] opacity-0'
                  }`}
                >
                  <StepVisual step={step.key} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3">
              {STEPS.map((step, i) => (
                <span
                  key={step.key}
                  className={`h-1 rounded-full transition-all duration-500 motion-reduce:transition-none ${
                    i === active ? 'w-10 bg-brand' : 'w-4 bg-neutral-200'
                  }`}
                />
              ))}
              <span className="ml-2 text-xs font-semibold tabular-nums tracking-widest text-neutral-400">
                0{active + 1} / 0{STEPS.length}
              </span>
            </div>
          </div>
        </div>

        <ol className="lg:py-[8vh]">
          {STEPS.map((step, i) => (
            <li
              key={step.key}
              ref={(el) => {
                stepRefs.current[i] = el
              }}
              data-index={i}
              className="flex flex-col justify-center pb-16 last:pb-0 lg:min-h-[40vh] lg:pb-0"
            >
              <div className="@container relative mb-8 aspect-[4/5] overflow-hidden rounded-2xl bg-brand sm:aspect-[4/3] lg:hidden" aria-hidden>
                <DotGrid />
                <StepVisual step={step.key} />
              </div>
              <p
                className={`text-sm font-semibold tabular-nums tracking-widest transition-colors duration-300 ${
                  i === active ? 'text-brand' : 'text-neutral-400'
                }`}
              >
                0{i + 1} · {step.label.toUpperCase()}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{step.title}</h3>
              <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-neutral-600">{step.body}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {step.tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600">
                    {tag}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// Lưới chấm trắng nhạt — cùng nền "canvas Figma" với hero
function DotGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.16)_1px,transparent_1px)] [background-size:20px_20px]"
    />
  )
}

// Minh hoạ từng bước — mỗi hình kể đúng đoạn mô tả bên cạnh, có chữ đọc được:
// Research: ghi chú thô → AI gom nhóm → theme kèm trích dẫn đã đối chiếu
// Wireframe: 3 phương án bố cục chỉ có màu xám, team chọn B, AI chỉ ra edge case
// Hi-fi: design system → 2 màn nối bằng thao tác bấm (prototype) → thông số bàn giao
// Bố cục dọc nên vừa cả khung 4:3 (desktop) lẫn 4:5 (điện thoại).
function StepVisual({step}: {step: StepKey}) {
  if (step === 'research') return <ResearchVisual />
  if (step === 'wireframe') return <WireframeVisual />
  return <HifiVisual />
}

function Caption({children}: {children: React.ReactNode}) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 @md:text-[11px]">{children}</p>
}

// Đường nối giữa 2 chặng, nhãn ở giữa
function Connector({label}: {label: string}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 border-t border-dashed border-white/40" />
      <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-ink">{label}</span>
      <span className="h-px flex-1 border-t border-dashed border-white/40" />
    </div>
  )
}

const THEMES = [
  {tag: 'Onboarding', insight: 'Sign-up asks too much, too early', quote: '“I gave up at the ID photo step.”'},
  {tag: 'Pricing', insight: 'The delivery fee shows up too late', quote: '“Why is it more at checkout?”'},
]

// Ghi chú thô, lộn xộn (nghiêng lệch) — gom lại thành 2 theme gọn bên dưới
const RAW_NOTES = [
  'Too many steps to sign up',
  'Why upload my ID first?',
  'Fee only shows at the end',
  'Gave up halfway',
  'Price changed at checkout?',
  'Where’s my promo code?',
]

function ResearchVisual() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 p-[6%] @md:gap-4">
      <Caption>Raw notes · interviews, surveys, support tickets</Caption>
      <div className="flex flex-wrap gap-1.5 @md:gap-2">
        {RAW_NOTES.map((note, i) => (
          <span
            key={note}
            className={`rounded-sm bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-900 shadow-md @md:text-[12px] ${
              ['-rotate-2', 'rotate-1', 'rotate-2', '-rotate-1', 'rotate-[1.5deg]', '-rotate-[1.5deg]'][i]
            }`}
          >
            {note}
          </span>
        ))}
      </div>
      <Connector label="✦ AI groups into themes" />
      <div className="grid grid-cols-2 gap-2.5 @md:gap-3">
        {THEMES.map((theme) => (
          <div key={theme.tag} className="flex flex-col rounded-lg bg-white p-2.5 text-ink shadow-lg @md:p-3">
            <span className="self-start rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand @md:text-[11px]">
              Theme · {theme.tag}
            </span>
            <p className="mt-2 text-[12px] font-semibold leading-snug @md:text-[14px]">{theme.insight}</p>
            <p className="mt-2 border-l-2 border-amber-300 pl-2 text-[11px] italic leading-snug text-neutral-500 @md:text-[12px]">
              {theme.quote}
            </p>
            <p className="mt-auto pt-2 text-[10px] font-semibold text-emerald-600 @md:text-[11px]">✓ Checked against raw quotes</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WireframeVisual() {
  const options = [
    {id: 'A', name: 'List'},
    {id: 'B', name: 'Cards'},
    {id: 'C', name: 'Map'},
  ]
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 p-[6%]">
      <Caption>3 layouts · structure first, no colour yet</Caption>
      <div className="grid grid-cols-3 gap-2.5">
        {options.map((option) => {
          const picked = option.id === 'B'
          return (
            <div key={option.id} className="flex flex-col gap-1.5">
              <div
                className={`relative flex aspect-[3/4] flex-col gap-1.5 overflow-hidden rounded-lg border-2 p-2 ${
                  picked ? 'border-accent bg-white/20' : 'border-white/30 bg-white/5'
                }`}
              >
                <span className="h-1.5 w-1/2 rounded bg-white/60" />
                {option.id === 'A' &&
                  [0, 1, 2, 3].map((row) => (
                    <span key={row} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 shrink-0 rounded-full bg-white/35" />
                      <span className="h-1 flex-1 rounded bg-white/35" />
                    </span>
                  ))}
                {option.id === 'B' && (
                  <span className="grid flex-1 grid-cols-2 gap-1.5">
                    {[0, 1, 2, 3].map((cell) => (
                      <span key={cell} className="rounded bg-white/35" />
                    ))}
                  </span>
                )}
                {option.id === 'C' && (
                  <>
                    <span className="relative flex-1 rounded bg-white/20">
                      <span className="absolute left-1/2 top-1/3 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white/70" />
                    </span>
                    <span className="h-1/4 rounded-t-md bg-white/35" />
                  </>
                )}
                {picked && (
                  <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-ink @md:text-[10px]">
                    ✓ Team pick
                  </span>
                )}
              </div>
              <span className={`text-center text-[11px] font-semibold ${picked ? 'text-white' : 'text-white/60'}`}>
                {option.id} · {option.name}
              </span>
            </div>
          )
        })}
      </div>
      <div className="rounded-lg border border-white/25 bg-white/10 p-2.5">
        <p className="text-[11px] font-semibold text-white">✦ AI flagged edge cases</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Empty list', 'Offline', 'Very long names'].map((edge) => (
            <span key={edge} className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-ink">
              {edge}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function HifiVisual() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 p-[6%]">
      {/* Design system: màu, chữ, nút — màn hi-fi bên dưới dựng từ đúng các khối này */}
      <div className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-2.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Design system</span>
        <span className="ml-auto h-4 w-4 rounded-full border-2 border-white bg-brand" />
        <span className="h-4 w-4 rounded-full bg-accent" />
        <span className="h-4 w-4 rounded-full bg-ink" />
        <span className="rounded bg-white px-1.5 text-[11px] font-bold text-ink">Aa</span>
        <span className="rounded bg-brand px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/60">Button</span>
      </div>

      {/* Prototype: bấm "Place order" ở màn 1 → sang màn 2 */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex aspect-[9/16] w-[34%] flex-col gap-1.5 rounded-xl border-[3px] border-ink bg-white p-2 shadow-2xl @md:w-[28%]">
          <span className="text-[10px] font-bold text-ink @md:text-[11px]">Checkout</span>
          {['bg-amber-300', 'bg-rose-300'].map((thumb) => (
            <span key={thumb} className="flex items-center gap-1.5">
              <span className={`h-4 w-4 shrink-0 rounded ${thumb}`} />
              <span className="h-1 flex-1 rounded bg-neutral-200" />
            </span>
          ))}
          <span className="mt-1 flex justify-between border-t border-neutral-100 pt-1.5">
            <span className="h-1 w-1/3 rounded bg-neutral-300" />
            <span className="h-1 w-1/5 rounded bg-neutral-400" />
          </span>
          <span className="relative mt-auto rounded-md bg-brand py-1 text-center text-[9px] font-semibold text-white ring-2 ring-accent ring-offset-1 @md:text-[10px]">
            Place order
            <svg viewBox="0 0 16 16" aria-hidden className="absolute -bottom-3 right-1 h-4 w-4 text-ink">
              <path d="M3 1 L3 13 L6.5 9.8 L9 15 L11 14 L8.6 8.9 L13 8.6 Z" fill="currentColor" stroke="white" strokeWidth="1" />
            </svg>
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand">on tap</span>
          <span className="text-lg leading-none text-white">→</span>
        </div>

        <div className="flex aspect-[9/16] w-[34%] flex-col items-center justify-center gap-1.5 rounded-xl border-[3px] border-ink bg-white p-2 shadow-2xl @md:w-[28%]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">✓</span>
          <span className="text-center text-[10px] font-bold text-ink @md:text-[11px]">Order placed</span>
          <span className="h-1 w-2/3 rounded bg-neutral-200" />
          <span className="h-1 w-1/2 rounded bg-neutral-200" />
        </div>
      </div>

      {/* Bàn giao: thông số của nút đang được bấm ở trên */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 text-ink shadow-lg">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Dev handoff</span>
        <span className="text-[12px] font-semibold">Primary button</span>
        <span className="font-mono text-[10px] text-neutral-500">H 48 · R 12 · #002FFF · 16/600</span>
      </div>
    </div>
  )
}
