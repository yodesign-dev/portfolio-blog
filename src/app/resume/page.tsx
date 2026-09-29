import React from 'react'
import {client} from '@/sanity/lib/client'
import {pageMetadata} from '@/lib/site'

export const revalidate = 60

export const metadata = pageMetadata({
  title: 'Resume',
  description: 'Resume of Bin Nguyen, product designer with 10+ years of end-to-end experience.',
  path: '/resume',
})

const RESUME_QUERY = `*[_type == "resume"][0]{
  isPublic,
  updatedAt,
  file{
    asset->{
      url,
      originalFilename
    }
  }
}`

type ResumeDoc = {
  isPublic?: boolean
  updatedAt?: string
  file?: {
    asset?: {
      url: string
      originalFilename?: string
    }
  }
}

async function getResume(): Promise<ResumeDoc | null> {
  return client.fetch(RESUME_QUERY, {}, {next: {revalidate}})
}

export default async function ResumePage() {
  const resume = await getResume()
  const fileUrl = resume?.file?.asset?.url
  const isAvailable = Boolean(resume?.isPublic && fileUrl)
  const fileName = resume?.file?.asset?.originalFilename || 'resume.pdf'

  const openButton = fileUrl
    ? React.createElement(
        'a',
        {
          href: fileUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          className:
            'flex-1 rounded-md bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700',
        },
        'Open PDF'
      )
    : null

  const downloadButton = fileUrl
    ? React.createElement(
        'a',
        {
          href: fileUrl,
          download: fileName,
          className:
            'flex-1 rounded-md border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50',
        },
        'Download'
      )
    : null

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Resume
          </h1>
        </div>
      </header>

      {!isAvailable ? (
        <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-neutral-600">My resume isn&apos;t public yet.</p>
            <p className="text-neutral-400">
              Want a copy? Use <span className="font-medium text-neutral-600">Get In Touch</span>{' '}
              at the top and I&apos;ll send it over.
            </p>
          </div>
        </main>
      ) : (
        <>
          {/* Desktop: nhúng PDF, thêm #view=FitH để trình xem PDF của trình
              duyệt fit theo chiều RỘNG khung thay vì chiều cao. Đã bỏ hẳn
              max-w (trước là max-w-3xl/max-w-5xl) — panel thumbnail bên
              trái của Chrome PDF Viewer có độ rộng CỐ ĐỊNH (~230px), khung
              càng hẹp thì panel đó càng ăn tỉ trọng lớn hơn của không gian
              còn lại, kéo zoom càng nhỏ. Bỏ max-w để container full chiều
              rộng viewport (chỉ còn giới hạn bởi px-6 sm:px-8 của <main>),
              cho panel thumbnail nhiều "đất" hơn, phần PDF còn lại lớn hơn. */}
          <main className="hidden md:block px-6 py-8 sm:px-8">
            <iframe
              src={`${fileUrl}#view=FitH`}
              title="Resume"
              className="mx-auto h-[calc(100vh-180px)] w-full rounded-lg border border-neutral-200"
            />
          </main>

          <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8 md:hidden">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 p-8 text-center">
              <p className="text-neutral-600">
                For the best reading experience on your phone, open the resume
                in your device&apos;s PDF viewer.
              </p>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                {openButton}
                {downloadButton}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  )
}
