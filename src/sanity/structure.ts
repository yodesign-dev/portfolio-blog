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
      // Nhật ký thay đổi: nút "Có gì mới" trên trang /chill
      S.documentTypeListItem('chillUpdate').title('Chill · Nhật ký thay đổi'),
      // Công tắc chung: mở / đóng phòng chat
      S.listItem()
        .title('Chill · Cài đặt')
        .id('chillSettings')
        .child(S.document().schemaType('chillSettings').documentId('chillSettings')),
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
      // Người xem bấm "I've sent it" ở mục Buy Bin a coffee và để lại lời nhắn
      S.listItem()
        .title('Chill · Supporters')
        .id('chillSupporter')
        .child(
          S.list()
            .title('Chill · Supporters')
            .items(
              [
                // Chưa tick "Đã nhận" trong 7 ngày gần đây — cũ hơn thì coi như không chuyển, chỉ còn ở "Tất cả"
                ['todo', '⏳ Chờ đối chiếu', 'received != true && dateTime(_createdAt) > dateTime(now()) - 60*60*24*7'],
                ['received', '✅ Đã nhận', 'received == true'],
                ['all', 'Tất cả', 'true'],
              ].map(([id, title, filter]) =>
                S.listItem()
                  .id(id)
                  .title(title)
                  .child(
                    S.documentTypeList('chillSupporter')
                      .title(title)
                      .filter(`_type == "chillSupporter" && ${filter}`)
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
        (listItem) => !['post', 'resume', 'tool', 'timelineYear', 'chillTrack', 'chillDestination', 'chillWish', 'chillSupporter', 'chillUpdate', 'chillSettings'].includes(listItem.getId() as string),
      ),
    ])
