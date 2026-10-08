import {defineField, defineType} from 'sanity'

// Điểm đến cho trang /chill — cảnh phố ngoài cửa sổ quán. Toàn bộ danh sách
// quản lý ở đây; src/components/chill/destinations.ts chỉ còn Hà Nội dự phòng.
const sceneImage = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'image',
    description: 'Ảnh ngang tỉ lệ 21:9 (vd. 1584×672), cùng bố cục với cảnh Hà Nội: lòng đường nằm sát mép dưới.',
    validation: (Rule) => Rule.required(),
  })

export default defineType({
  name: 'chillDestination',
  title: 'Chill · Điểm đến',
  type: 'document',
  groups: [
    {name: 'content', title: 'Nội dung', default: true},
    {name: 'advanced', title: 'Căn chỉnh'},
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Tên',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Mã',
      type: 'slug',
      group: 'content',
      options: {source: 'name'},
      description: 'Dùng để trang nhớ điểm đến người xem chọn lần trước.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Quốc gia / vùng',
      type: 'string',
      group: 'content',
      initialValue: 'Việt Nam',
    }),
    defineField({
      name: 'timeZone',
      title: 'Múi giờ',
      type: 'string',
      group: 'content',
      initialValue: 'Asia/Ho_Chi_Minh',
      description: 'Múi giờ IANA cho đồng hồ trên đầu trang, vd. Asia/Tokyo, Europe/Paris.',
    }),
    sceneImage('morning', 'Ảnh buổi sáng'),
    sceneImage('afternoon', 'Ảnh buổi chiều'),
    sceneImage('night', 'Ảnh ban đêm'),
    defineField({
      name: 'order',
      title: 'Thứ tự',
      type: 'number',
      group: 'content',
      description: 'Số nhỏ đứng trước. Để trống thì xếp theo ngày tạo.',
    }),
    defineField({
      name: 'hidden',
      title: 'Ẩn khỏi trang',
      type: 'boolean',
      group: 'content',
      initialValue: false,
      description: 'Tạm gỡ điểm đến khỏi danh sách mà không cần xoá.',
    }),
    defineField({
      name: 'scenery',
      title: 'Kiểu cảnh',
      type: 'string',
      group: 'content',
      options: {
        list: [
          {title: 'Phố (ô tô, xe buýt, shipper, cặp đôi…)', value: 'street'},
          {title: 'Đồng quê (chỉ xe máy, xe đạp; lúa lắc lư theo gió)', value: 'countryside'},
        ],
        layout: 'radio',
      },
      initialValue: 'street',
      description: 'Đồng quê: phần ruộng trong ảnh tự lắc theo gió, đường chỉ có xe máy / xe đạp / chó.',
    }),
    defineField({
      name: 'tilt',
      title: 'Độ nghiêng mặt đường',
      type: 'number',
      group: 'advanced',
      description: 'Chỉ cần khi phố trong ảnh bị dốc (xe máy chạy lệch khỏi đường). Âm = dốc lên bên phải, vd. -0.075 như Đà Lạt.',
    }),
    defineField({
      name: 'laneShift',
      title: 'Dời làn xe (px)',
      type: 'number',
      group: 'advanced',
      description: 'Âm = dời làn xe lên, dương = xuống. Thường để trống.',
    }),
  ],
  orderings: [{title: 'Thứ tự', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'region', media: 'morning'},
  },
})
