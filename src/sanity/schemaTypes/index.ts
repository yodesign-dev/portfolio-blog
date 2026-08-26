import {type SchemaTypeDefinition} from 'sanity'
import post from './post'
import resume from './resume'
// ⬇️ CẬP NHẬT: import schema tool mới
import tool from './tool'

export const schema: {types: SchemaTypeDefinition[]} = {
  // ⬇️ CẬP NHẬT: thêm tool vào danh sách types
  types: [post, resume, tool],
}
