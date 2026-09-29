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

  if (isStudio) {
    return <>{children}</>
  }

  return (
    <ContactModalProvider>
      <Navbar showResume={showResume} />
      {children}
      <SiteFooter showResume={showResume} />
      <ContactModal />
    </ContactModalProvider>
  )
}
