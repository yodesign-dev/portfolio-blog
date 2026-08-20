import {type SchemaTypeDefinition} from 'sanity'
import post from './post'
// ⬇️ CẬP NHẬT: import schema resume mới
import resume from './resume'

export const schema: {types: SchemaTypeDefinition[]} = {
  // ⬇️ CẬP NHẬT: thêm resume vào danh sách types
  types: [post, resume],
}
