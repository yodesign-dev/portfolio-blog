export type Locale = 'vi' | 'en'

export const DEFAULT_LOCALE: Locale = 'vi'

export const dictionary = {
  vi: {
    nav: {
      home: 'Trang chủ',
      blog: 'Blog',
      resume: 'Resume',
      tools: 'Tools',
      timeline: 'Timeline',
      getInTouch: 'Liên hệ',
    },
    common: {
      backHome: '← Về trang chủ',
      all: 'Tất cả',
      loadMore: 'Xem thêm',
      itemsSuffix: 'công cụ nữa',
    },
    blog: {
      title: 'Blog',
      subtitle: 'Ghi chép và chia sẻ trong quá trình học & làm việc.',
      empty: 'Chưa có bài viết nào được đăng.',
      emptyTag: (tag: string) => `Chưa có bài viết nào gắn tag "${tag}".`,
    },
    tools: {
      title: 'Tools',
      subtitle: 'Thư viện các công cụ mình đang dùng trong công việc hằng ngày.',
      empty: 'Chưa có công cụ nào được thêm.',
    },
    timeline: {
      title: 'Timeline',
      subtitle: 'Công cụ thiết kế & AI được dùng nhiều qua từng năm.',
      empty: 'Chưa có dữ liệu timeline nào.',
    },
  },
  en: {
    nav: {
      home: 'Home',
      blog: 'Blogs',
      resume: 'Resume',
      tools: 'Tools',
      timeline: 'Timeline',
      getInTouch: 'Get In Touch',
    },
    common: {
      backHome: '← Back to home',
      all: 'All',
      loadMore: 'Load more',
      itemsSuffix: 'more tools',
    },
    blog: {
      title: 'Blog',
      subtitle: 'Notes and things I learn along the way.',
      empty: 'No posts published yet.',
      emptyTag: (tag: string) => `No posts tagged "${tag}" yet.`,
    },
    tools: {
      title: 'Tools',
      subtitle: 'The tools I actually use in my day-to-day work.',
      empty: 'No tools added yet.',
    },
    timeline: {
      title: 'Timeline',
      subtitle: 'Design & AI tools used most over the years.',
      empty: 'No timeline data yet.',
    },
  },
} as const

export function getDictionary(locale: Locale) {
  return dictionary[locale] ?? dictionary[DEFAULT_LOCALE]
}
