import {CaseStudyCard, getCaseStudies} from '@/components/CaseStudyCard'
import {BehanceArchive} from '@/components/BehanceArchive'
import {getBehanceProjects, withoutCaseStudies} from '@/lib/behance'
import {pageMetadata} from '@/lib/site'

export const revalidate = 60

export const metadata = pageMetadata({
  title: 'Work',
  description: 'Selected product design case studies by Bin Nguyen — the problem, the process and the impact.',
  path: '/work',
})

export default async function WorkPage() {
  // Behance RSS cache riêng 1 ngày (dự án cũ, ít thay đổi)
  const [studies, behance] = await Promise.all([getCaseStudies(revalidate), getBehanceProjects()])

  // Project đã có case study trên site thì không lặp lại ở mục Behance
  const archive = withoutCaseStudies(behance, studies)

  return (
    <div className="min-h-screen bg-background text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Work</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">
            Selected case studies — the problem, how I worked through it, and what changed.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        {/* Chưa có case study mà Behance có project → để Behance đứng đầu,
            không hiện dòng "on their way" trơ trọi phía trên */}
        {studies.length === 0 ? (
          archive.length === 0 && <p className="text-center text-neutral-400">Case studies are on their way.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {studies.map((study) => (
              <CaseStudyCard key={study._id} study={study} />
            ))}
          </div>
        )}

        <BehanceArchive projects={archive} lead={studies.length === 0} />
      </main>
    </div>
  )
}
