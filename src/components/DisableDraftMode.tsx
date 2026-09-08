'use client'

export function DisableDraftMode() {
  return (
    <a
      href="/api/draft-mode/disable"
      className="fixed bottom-4 right-4 z-[1000] rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-neutral-700"
    >
      Tắt chế độ xem trước
    </a>
  )
}
