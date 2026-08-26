import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('post').title('Bài viết'),

      // ⬇️ CẬP NHẬT: mục "Công cụ" — danh sách bình thường (không phải
      // singleton như Resume), vì có thể có nhiều tool.
      S.documentTypeListItem('tool').title('Công cụ'),

      S.listItem()
        .title('Resume')
        .id('resume')
        .child(
          S.document()
            .schemaType('resume')
            .documentId('resume')
        ),

      ...S.documentTypeListItems().filter(
        (listItem) => !['post', 'resume', 'tool'].includes(listItem.getId() as string),
      ),
    ])
