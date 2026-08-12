import Link from 'next/link'

const NAV_LINKS = [
  {label: 'Giới thiệu', href: '#hero'},
  {label: 'Dự án', href: '#projects'},
  {label: 'Blog', href: '/blog'},
  {label: 'Liên hệ', href: '#contact'},
]

const PROJECTS = [
  {
    index: '01',
    title: 'Hệ thống đặt lịch khám bệnh',
    description:
      'Nền tảng đặt lịch trực tuyến giúp phòng khám giảm 40% thời gian chờ, xây dựng với Next.js và PostgreSQL.',
    stack: ['Next.js', 'PostgreSQL', 'Tailwind'],
    href: '/blog',
    size: 'lg',
  },
  {
    index: '02',
    title: 'Công cụ theo dõi chi tiêu cá nhân',
    description: 'Ứng dụng quản lý tài chính cá nhân với biểu đồ trực quan và nhắc nhở ngân sách hàng tháng.',
    stack: ['React', 'Node.js'],
    href: '/blog',
    size: 'sm',
  },
  {
    index: '03',
    title: 'Landing page cho startup EdTech',
    description: 'Thiết kế và phát triển trang giới thiệu sản phẩm, tối ưu tốc độ tải và chuẩn SEO.',
    stack: ['Next.js', 'Sanity CMS'],
    href: '/blog',
    size: 'sm',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5 sm:px-8">
          <Link href="/" className="text-sm font-medium tracking-tight text-neutral-900">
            Nguyễn&nbsp;Văn&nbsp;A
            <span className="ml-1 text-neutral-400">/dev</span>
          </Link>

          <nav aria-label="Điều hướng chính">
            <ul className="flex items-center gap-6 sm:gap-8">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="hero" className="mx-auto max-w-4xl px-6 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28">
          <p className="mb-6 font-mono text-xs tracking-widest text-neutral-400">
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-900 align-middle" />
            SHARING TO LEARNING
          </p>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-5xl">
            Nguyễn Văn A
          </h1>

          <p className="mt-3 text-lg text-neutral-500 sm:text-xl">Lập trình viên Full-stack</p>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            Tôi xây dựng những sản phẩm web gọn gàng, chạy nhanh và dễ bảo trì —
            nơi mỗi dòng code đều có lý do để tồn tại.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="#projects"
              className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Xem dự án
            </Link>
            <Link
              href="#contact"
              className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
            >
              Liên hệ với tôi
            </Link>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="border-t border-neutral-200">
          <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8 sm:py-28">
            <div className="mb-12 flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Dự án tiêu biểu</h2>
              <span className="font-mono text-xs text-neutral-400">{PROJECTS.length} dự án</span>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {PROJECTS.map((project) => (
                <article
                  key={project.index}
                  className={`group flex flex-col justify-between rounded-2xl border border-neutral-200 p-6 transition-colors hover:border-neutral-900 sm:p-8 ${
                    project.size === 'lg' ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div>
                    <span className="font-mono text-xs text-neutral-400">{project.index}</span>

                    <h3 className="mt-3 text-lg font-medium text-neutral-900 sm:text-xl">
                      {project.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
                      {project.description}
                    </p>

                    <ul className="mt-5 flex flex-wrap gap-2">
                      {project.stack.map((tech) => (
                        <li
                          key={tech}
                          className="rounded-full bg-neutral-100 px-3 py-1 font-mono text-xs text-neutral-600"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={project.href}
                    className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-900"
                  >
                    Xem chi tiết
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t border-neutral-200">
          <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8 sm:py-28">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Cùng làm việc chứ?</h2>
            <p className="mt-3 max-w-md text-neutral-500">
              Tôi luôn sẵn sàng lắng nghe những ý tưởng mới. Gửi email cho tôi bất cứ lúc nào.
            </p>
            <a
              href="mailto:hello@example.com"
              className="mt-6 inline-block text-lg font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900"
            >
              hello@example.com
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs text-neutral-400 sm:flex-row sm:px-8">
          <span>© {new Date().getFullYear()} Nguyễn Văn A. Đã giữ mọi quyền.</span>
          <span className="font-mono">Được xây bằng Next.js &amp; Tailwind CSS</span>
        </div>
      </footer>
    </div>
  )
}
