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
    {name: 'facade', title: 'Mặt phố'},
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
          {title: 'Đường tàu (không xe cộ; đoàn tàu chạy qua vài phút một lần)', value: 'railway'},
        ],
        layout: 'radio',
      },
      initialValue: 'street',
      description:
        'Đồng quê: phần ruộng trong ảnh tự lắc theo gió, đường chỉ có xe máy / xe đạp / chó. Đường tàu: ray nằm ở dải làn xe sát mép dưới ảnh, chỉ có người đi bộ và đoàn tàu. Cần bản code đã có kiểu này trước khi bật hiện — code cũ coi là phố thường, cho ô tô chạy trên ray.',
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
    defineField({
      name: 'signs',
      title: 'Bảng hiệu neon (ban đêm)',
      type: 'array',
      group: 'facade',
      description:
        'Chỉ hiện khi bật "Mặt phố sống động" trong Chill · Cài đặt. Để trống thì dùng bảng hiệu mặc định trong code (nếu cảnh có). Chữ pixel 3×5, có dấu tiếng Việt; mỗi chữ rộng 4 px của ảnh 560 px, nên đặt lên một mảng tường / bảng tối.',
      of: [
        {
          type: 'object',
          name: 'neonSign',
          fields: [
            defineField({name: 'text', title: 'Chữ', type: 'string', validation: (Rule) => Rule.required().max(14), description: 'Viết hoa không bắt buộc, vd. CÀ PHÊ, PHỞ BÒ, KARAOKE.'}),
            defineField({name: 'x', title: 'Vị trí ngang (%)', type: 'number', validation: (Rule) => Rule.required().min(0).max(100), description: 'Mép trái hàng chữ, tính theo % chiều ngang ảnh phố.'}),
            defineField({name: 'y', title: 'Vị trí dọc (%)', type: 'number', validation: (Rule) => Rule.required().min(0).max(100), description: 'Đỉnh thân chữ (dấu nằm phía trên), tính theo % chiều cao ảnh phố.'}),
            defineField({
              name: 'color',
              title: 'Màu',
              type: 'string',
              initialValue: 'pink',
              options: {list: [{title: 'Hồng', value: 'pink'}, {title: 'Xanh ngọc', value: 'cyan'}, {title: 'Đỏ', value: 'red'}, {title: 'Xanh lá', value: 'green'}, {title: 'Vàng', value: 'yellow'}], layout: 'radio', direction: 'horizontal'},
            }),
            defineField({
              name: 'mode',
              title: 'Cách sáng',
              type: 'string',
              initialValue: 'sweep',
              options: {list: [{title: 'Bật từng chữ, chớp rồi nghỉ', value: 'sweep'}, {title: 'Sáng đều, thỉnh thoảng chập chờn', value: 'steady'}, {title: 'Nhấp nháy', value: 'blink'}], layout: 'radio'},
            }),
          ],
          preview: {select: {title: 'text', subtitle: 'color'}},
        },
      ],
    }),
  ],
  orderings: [{title: 'Thứ tự', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'region', media: 'morning'},
  },
})
