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
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand">
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
              <div className="relative mb-8 aspect-[4/3] overflow-hidden rounded-2xl bg-brand lg:hidden" aria-hidden>
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

// Minh hoạ từng bước, vẽ bằng khối (không dùng ảnh) theo đúng ngôn ngữ của
// frame Research / Wireframe / Hi-fi ở hero.
function StepVisual({step}: {step: StepKey}) {
  if (step === 'research') {
    const clusters = [
      {label: 'Onboarding', notes: 4},
      {label: 'Pricing', notes: 3},
      {label: 'Trust', notes: 2},
    ]
    return (
      <div className="absolute inset-0 flex items-center justify-center gap-[4%] p-[8%]">
        {clusters.map((cluster) => (
          <div key={cluster.label} className="flex w-[28%] flex-col gap-2 rounded-xl border border-dashed border-white/40 p-2.5">
            <span className="self-start rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-ink">
              {cluster.label}
            </span>
            {Array.from({length: cluster.notes}, (_, n) => (
              <span key={n} className="block aspect-[5/3] rounded-md bg-amber-100 shadow-sm odd:rotate-[-1.5deg] even:rotate-[1.5deg]">
                <span className="mx-2 mt-2 block h-1 w-3/4 rounded bg-amber-300/70" />
                <span className="mx-2 mt-1 block h-1 w-1/2 rounded bg-amber-300/70" />
              </span>
            ))}
          </div>
        ))}
        <span className="absolute bottom-[4%] right-[5%] rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-brand shadow">
          AI · 3 themes from 120 notes
        </span>
      </div>
    )
  }

  if (step === 'wireframe') {
    return (
      <div className="absolute inset-0 flex items-center justify-center gap-[4%] p-[8%]">
        {[0, 1, 2].map((v) => (
          <div
            key={v}
            className={`flex aspect-[9/16] w-[26%] flex-col gap-2 rounded-xl border-2 p-2.5 ${
              v === 1 ? 'border-accent bg-white/15' : 'border-white/35 bg-white/5'
            }`}
          >
            <span className="h-2 w-1/2 rounded bg-white/50" />
            <span className={`rounded bg-white/25 ${v === 0 ? 'h-1/3' : v === 1 ? 'h-1/4' : 'h-2/5'}`} />
            <span className="h-1.5 w-full rounded bg-white/30" />
            <span className="h-1.5 w-4/5 rounded bg-white/30" />
            {v !== 2 && <span className="h-1.5 w-3/5 rounded bg-white/30" />}
            <span className={`mt-auto h-5 rounded ${v === 1 ? 'bg-accent' : 'border border-white/40'}`} />
          </div>
        ))}
        <span className="absolute bottom-[7%] left-1/2 -translate-x-1/2 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-brand shadow">
          Variant B · picked
        </span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 p-[8%]">
      <div className="h-full w-[78%] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-neutral-100 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="ml-3 h-2 w-1/2 rounded bg-neutral-100" />
        </div>
        <div className="flex h-full gap-3 p-3">
          <div className="flex w-1/5 flex-col gap-2">
            <span className="h-4 w-full rounded-md bg-brand" />
            <span className="h-1.5 w-4/5 rounded bg-neutral-200" />
            <span className="h-1.5 w-3/5 rounded bg-neutral-200" />
            <span className="h-1.5 w-4/5 rounded bg-neutral-200" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((c) => (
                <span key={c} className="h-10 rounded-md border border-neutral-100 bg-neutral-50" />
              ))}
            </div>
            {['bg-red-400', 'bg-amber-400', 'bg-emerald-500', 'bg-indigo-400'].map((color) => (
              <div key={color} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                <span className="h-1.5 flex-1 rounded bg-neutral-100" />
                <span className="h-1.5 w-1/5 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-[8%] right-[7%] flex aspect-[9/19] w-[20%] flex-col gap-1.5 rounded-xl border-[3px] border-ink bg-white p-1.5 shadow-2xl">
        <span className="mx-auto h-1 w-1/3 rounded-full bg-ink" />
        <span className="h-1/4 rounded-md bg-brand/90" />
        <span className="h-1 w-4/5 rounded bg-neutral-200" />
        <span className="h-1 w-3/5 rounded bg-neutral-200" />
        <span className="mt-auto h-3 rounded bg-accent" />
      </div>
      <span className="absolute left-[7%] top-[5%] rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-ink shadow">
        ▶ Prototype
      </span>
    </div>
  )
}
