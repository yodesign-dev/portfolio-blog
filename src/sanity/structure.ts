import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('post').title('Bài viết'),
      S.documentTypeListItem('tool').title('Công cụ'),
      // ⬇️ CẬP NHẬT: mục "Timeline" — danh sách bình thường (nhiều năm),
      // không phải singleton
      S.documentTypeListItem('timelineYear').title('Timeline'),
      S.divider(),
      // Trang /chill: nhạc + điểm đến thêm từ Studio (ngoài bộ có sẵn trong code)
      S.documentTypeListItem('chillTrack').title('Chill · Nhạc'),
      S.documentTypeListItem('chillDestination').title('Chill · Điểm đến'),
      // Góp ý người xem gửi từ khung Wishlist (tạo qua API, không tạo tay ở đây)
      S.listItem()
        .title('Chill · Wishlist')
        .id('chillWish')
        .child(
          S.list()
            .title('Chill · Wishlist')
            .items(
              [
                ['pending', '⏳ Chờ duyệt', 'status == "pending"'],
                ['public', '👀 Đang hiện', 'status in ["considering", "planned"]'],
                ['shipped', '✅ Đã làm', 'status == "shipped"'],
                ['hidden', '🚫 Đã ẩn', 'status == "hidden"'],
                ['all', 'Tất cả', 'true'],
              ].map(([id, title, filter]) =>
                S.listItem()
                  .id(id)
                  .title(title)
                  .child(
                    S.documentTypeList('chillWish')
                      .title(title)
                      .filter(`_type == "chillWish" && ${filter}`)
                      .defaultOrdering([{field: '_createdAt', direction: 'desc'}])
                      .initialValueTemplates([]),
                  ),
              ),
            ),
        ),
      S.divider(),

      S.listItem()
        .title('Resume')
        .id('resume')
        .child(
          S.document()
            .schemaType('resume')
            .documentId('resume')
        ),

      ...S.documentTypeListItems().filter(
        (listItem) => !['post', 'resume', 'tool', 'timelineYear', 'chillTrack', 'chillDestination', 'chillWish'].includes(listItem.getId() as string),
      ),
    ])
