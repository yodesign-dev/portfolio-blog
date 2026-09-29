import type {PresentationPluginOptions} from 'sanity/presentation'

// Cho Presentation Tool biết 1 document tương ứng với URL nào trên site
// thật, để hiện đúng trang khi bạn click chọn document trong Studio.
export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    post: {
      select: {title: 'title', slug: 'slug.current', isCaseStudy: 'isCaseStudy'},
      resolve: (doc) => ({
        locations: doc?.isCaseStudy
          ? [
              {title: doc?.title || 'Bài viết chưa đặt tên', href: `/work/${doc?.slug}`},
              {title: 'Trang Work', href: '/work'},
            ]
          : [
              {title: doc?.title || 'Bài viết chưa đặt tên', href: `/blog/${doc?.slug}`},
              {title: 'Trang Writing', href: '/blog'},
            ],
      }),
    },
    tool: {
      select: {name: 'name'},
      resolve: (doc) => ({
        locations: [
          {title: doc?.name || 'Công cụ chưa đặt tên', href: '/tools'},
        ],
      }),
    },
    timelineYear: {
      select: {year: 'year'},
      resolve: (doc) => ({
        locations: [
          {title: doc?.year ? String(doc.year) : 'Năm chưa đặt', href: '/tools/timeline'},
        ],
      }),
    },
  },
}
