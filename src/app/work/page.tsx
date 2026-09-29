import {CaseStudyCard, getCaseStudies} from '@/components/CaseStudyCard'

export const revalidate = 60

export const metadata = {
  title: 'Work',
  description: 'Selected product design case studies — the problem, the process and the impact.',
}

export default async function WorkPage() {
  const studies = await getCaseStudies(revalidate)

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">Work</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">
            Selected case studies — the problem, how I worked through it, and what changed.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        {studies.length === 0 ? (
          <p className="text-center text-neutral-400">Case studies are on their way.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2">
            {studies.map((study, index) => (
              <CaseStudyCard key={study._id} study={study} priority={index < 2} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
