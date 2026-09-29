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
        (listItem) => !['post', 'resume', 'tool', 'timelineYear', 'chillTrack', 'chillDestination'].includes(listItem.getId() as string),
      ),
    ])
