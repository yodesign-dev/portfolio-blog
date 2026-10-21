import Image from 'next/image'
import {BEHANCE_PROFILE, type BehanceProject} from '@/lib/behance'

// Section "More on Behance" dưới danh sách case study ở /work — project cũ hơn,
// lấy tự động từ RSS Behance (cập nhật mỗi ngày), bấm vào mở sang Behance.
// lead: chưa có case study nào → section này đứng đầu trang, bỏ đường kẻ ngăn.
export function BehanceArchive({projects, lead = false}: {projects: BehanceProject[]; lead?: boolean}) {
  if (projects.length === 0) return null

  return (
    <section className={lead ? '' : 'mt-24 border-t border-neutral-200 pt-16'} aria-labelledby="behance-archive">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="behance-archive" className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {lead ? 'Projects' : 'More on Behance'}
          </h2>
          <p className="mt-2 max-w-2xl text-neutral-500">
            {lead
              ? 'Product and UI work — each one opens the full write-up on Behance.'
              : 'Earlier projects and UI explorations — pulled straight from my Behance.'}
          </p>
        </div>
        <a
          href={BEHANCE_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          View all on Behance ↗
        </a>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project.url}>
            <BehanceCard project={project} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// Thẻ 1 project Behance — dùng ở /work và mục "Selected work" trang chủ
// (khi Sanity chưa có case study).
export function BehanceCard({project, sizes = '(min-width: 1024px) 352px, (min-width: 640px) 50vw, 100vw'}: {
  project: BehanceProject
  sizes?: string
}) {
  return (
    <a href={project.url} target="_blank" rel="noopener noreferrer" className="group block">
      {/* Hover: khung ảnh nhấc nhẹ + nhãn "View on Behance" trồi lên */}
      <div className="relative overflow-hidden rounded-xl bg-neutral-100 transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_22px_40px_-20px_rgb(11_20_50/0.45)] motion-reduce:transform-none">
        {project.cover ? (
          <Image
            src={project.cover}
            alt={project.title}
            width={808}
            height={632}
            sizes={sizes}
            className="aspect-[4/3] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="aspect-[4/3] w-full" />
        )}
        <span
          aria-hidden="true"
          className="absolute bottom-3 left-3 translate-y-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink opacity-0 shadow-sm transition duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          View on Behance ↗
        </span>
      </div>
      {project.year && (
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">Behance · {project.year}</p>
      )}
      <h3 className="mt-1.5 text-lg font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-brand">
        {project.title} <span aria-hidden="true" className="text-neutral-300 group-hover:text-brand">↗</span>
        <span className="sr-only"> (opens Behance in a new tab)</span>
      </h3>
    </a>
  )
}
