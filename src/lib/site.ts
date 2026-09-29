// Thông tin nhận diện dùng chung cho Navbar, Footer, metadata — sửa 1 chỗ
// là đổi toàn site.
export const SITE_NAME = 'Bin Nguyen'
export const SITE_ROLE = 'Product Designer × AI'

export const NAV_LINKS = [
  {href: '/work', label: 'Work'},
  {href: '/blog', label: 'Writing'},
  {href: '/tools', label: 'Toolkit'},
  {href: '/resume', label: 'Resume'},
]

// Link mạng xã hội hiện ở Footer — để trống href thì mục đó tự ẩn.
export const SOCIAL_LINKS: {label: string; href: string}[] = [
  {label: 'LinkedIn', href: 'https://linkedin.com/in/binhnguyen1985'},
  {label: 'Dribbble', href: ''},
  {label: 'Behance', href: 'https://www.behance.net/applebin'},
  {label: 'Medium', href: 'https://medium.com/@applebin'},
]
