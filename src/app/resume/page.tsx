import Link from 'next/link'
import React from 'react'
import {client} from '@/sanity/lib/client'

export const revalidate = 60

export const metadata = {
  title: 'Resume',
}

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
        'Mở PDF'
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
        'Tải xuống'
      )
    : null

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-4xl px-6 py-6 sm:px-8">
          <Link
            href="/"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            ← Về trang chủ
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Resume
          </h1>
        </div>
      </header>

      {!isAvailable ? (
        <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
          <p className="text-center text-neutral-400">
            Resume hiện chưa được công khai, quay lại sau nhé.
          </p>
        </main>
      ) : (
        <>
          {/* Desktop: nhúng PDF, thêm #view=FitH để trình xem PDF của trình
              duyệt fit theo chiều RỘNG khung thay vì chiều cao — tránh bị
              zoom thu nhỏ xuống 33-45% như hành vi mặc định trước đây.
              max-w-3xl (hẹp hơn bản trước là max-w-5xl) để khung gần đúng
              tỉ lệ khổ dọc A4, giúp FitH tính ra zoom gần 100%. */}
          <main className="hidden md:block px-6 py-8 sm:px-8">
            <iframe
              src={`${fileUrl}#view=FitH`}
              title="Resume"
              className="mx-auto h-[calc(100vh-180px)] w-full max-w-3xl rounded-lg border border-neutral-200"
            />
          </main>

          <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8 md:hidden">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 p-8 text-center">
              <p className="text-neutral-600">
                Để có trải nghiệm đọc tốt nhất trên điện thoại, mở resume bằng
                trình xem PDF của máy thay vì xem trực tiếp trên trang.
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
