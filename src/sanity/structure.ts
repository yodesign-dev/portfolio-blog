import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // ⬇️ CẬP NHẬT: giữ "Bài viết" (post) như cũ, hiện dạng danh sách bình thường
      S.documentTypeListItem('post').title('Bài viết'),

      // ⬇️ CẬP NHẬT: mục "Resume" — singleton. Bấm vào sẽ mở thẳng document
      // có id cố định là "resume", không hiện danh sách, không có nút "+" tạo
      // mới — nên không thể lỡ tay tạo 2 resume cùng lúc.
      S.listItem()
        .title('Resume')
        .id('resume')
        .child(
          S.document()
            .schemaType('resume')
            .documentId('resume')
        ),

      // ⬇️ CẬP NHẬT: các document type còn lại (nếu sau này thêm type mới)
      // vẫn tự động hiện ra như bình thường, trừ "post" và "resume" đã khai
      // báo thủ công ở trên (lọc ra để tránh hiện trùng lặp 2 lần).
      ...S.documentTypeListItems().filter(
        (listItem) => !['post', 'resume'].includes(listItem.getId() as string),
      ),
    ])
