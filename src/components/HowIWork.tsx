// Mục "How I work" trang chủ: một hàng ngắn để lướt, chi tiết nằm trong các case study.
const STEPS = [
  {title: 'Research', body: 'Interviews and tickets, clustered with AI, checked against raw quotes.'},
  {title: 'Wireframe', body: 'Several flows fast, edge cases included, structure agreed before colour.'},
  {title: 'Hi-fi', body: 'Design system, clickable prototype, clear handoff.'},
]

export function HowIWork() {
  return (
    <section aria-labelledby="how-i-work" className="mx-auto max-w-6xl px-6 pt-24 sm:px-8">
      <h2 id="how-i-work" className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        How I work
      </h2>
      <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border-t border-neutral-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              {String(index + 1).padStart(2, '0')} · {step.title}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
