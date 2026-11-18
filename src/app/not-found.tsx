import Link from 'next/link'

// Trang 404 theo style của site (trước đây là trang mặc định của Next: không có đường quay về,
// không theo màu và chữ của site). Hiện khi một route gọi notFound() hoặc URL không khớp route nào.
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6 py-20 text-center text-neutral-900 antialiased">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-brand">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-neutral-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="btn-hard mt-8 flex min-h-12 items-center justify-center bg-brand px-6 text-white hover:bg-brand-hover"
      >
        Back to home
      </Link>
    </div>
  )
}
