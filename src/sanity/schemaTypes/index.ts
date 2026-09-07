import {type SchemaTypeDefinition} from 'sanity'
import post from './post'
import resume from './resume'
import tool from './tool'
// ⬇️ CẬP NHẬT: import schema timelineYear mới
import timelineYear from './timelineYear'

export const schema: {types: SchemaTypeDefinition[]} = {
  // ⬇️ CẬP NHẬT: thêm timelineYear vào danh sách types
  types: [post, resume, tool, timelineYear],
}
