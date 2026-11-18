'use client'

import {usePathname} from 'next/navigation'
import {Navbar} from '@/components/originkit/ui/hero-31/navbar'
import {ContactModalProvider} from '@/components/originkit/ui/hero-31/contact-modal-context'
import {ContactModal} from '@/components/originkit/ui/hero-31/contact-modal'
import {SiteFooter} from '@/components/SiteFooter'

// MỚI: Sanity Studio (route /studio) cần chiếm TRỌN viewport — nó tự quản
// lý layout riêng (sidebar, thanh Publish cố định dưới cùng...). Nếu vẫn
// hiện Navbar của site phía trên, Studio bị đẩy xuống và thanh Publish bị
// đẩy ra ngoài màn hình. Component này kiểm tra pathname, bỏ qua Navbar +
// ContactModal khi đang ở /studio.
export function SiteChrome({
  children,
  showResume,
}: {
  children: React.ReactNode
  showResume: boolean
}) {
  const pathname = usePathname()
  const isStudio = pathname?.startsWith('/studio')
  // /chill là màn hình tập trung: cảnh phủ trọn viewport, có nút riêng để
  // quay về trang chủ nên cũng bỏ Navbar + Footer. /chill/embed nằm trong khung
  // nhúng của site khác nên càng không cần
  const isChill = pathname === '/chill' || pathname?.startsWith('/chill/')

  if (isStudio || isChill) {
    return <>{children}</>
  }

  // data-skin="paper": bật da "giấy" của portfolio (khối [data-skin="paper"] trong globals.css).
  // Đặt ở đây chứ không ở <html> để /chill và Studio không dính. `contents`: khối bọc không
  // tạo hộp nào nên bố cục flex cột của <body> (footer dính đáy) vẫn y như cũ.
  return (
    <ContactModalProvider>
      <div data-skin="paper" className="contents">
        <Navbar showResume={showResume} />
        {children}
        <SiteFooter showResume={showResume} />
        <ContactModal />
      </div>
    </ContactModalProvider>
  )
}
