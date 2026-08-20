import Link from 'next/link'
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

      <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        {!isAvailable ? (
          <p className="text-center text-neutral-400">
            Resume hiện chưa được công khai, quay lại sau nhé.
          </p>
        ) : (
          <>
            {/* Desktop (md trở lên): nhúng PDF trực tiếp để đọc ngay trên trang */}
            <div className="hidden md:block">
              <iframe
                src={fileUrl}
                title="Resume"
                className="h-[85vh] w-full rounded-lg border border-neutral-200"
              />
            </div>

            {/* Mobile: KHÔNG nhúng iframe — PDF trong iframe trên mobile browser
                (đặc biệt Safari iOS và in-app webview của FB/LinkedIn/Zalo) hay
                render lỗi hoặc rất khó đọc. Thay bằng 2 nút để mở/tải bằng
                trình xem PDF gốc của máy, trải nghiệm mượt hơn hẳn. */}
            <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 p-8 text-center md:hidden">
              <p className="text-neutral-600">
                Để có trải nghiệm đọc tốt nhất trên điện thoại, mở resume bằng
                trình xem PDF của máy thay vì xem trực tiếp trên trang.
              </p>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-md bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
                >
                  Mở PDF
                </a>
                <a
                  href={fileUrl}
                  download={resume?.file?.asset?.originalFilename || 'resume.pdf'}
                  className="flex-1 rounded-md border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  Tải xuống
                </a>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
