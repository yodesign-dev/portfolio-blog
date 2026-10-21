import type {StructureResolver} from 'sanity/structure'
// @sanity/icons bản 5 tách mỗi icon một đường dẫn riêng
import {BulbOutlineIcon} from '@sanity/icons/BulbOutline'
import {CalendarIcon} from '@sanity/icons/Calendar'
import {CommentIcon} from '@sanity/icons/Comment'
import {ControlsIcon} from '@sanity/icons/Controls'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {HeartIcon} from '@sanity/icons/Heart'
import {LockIcon} from '@sanity/icons/Lock'
import {PinIcon} from '@sanity/icons/Pin'
import {PlayIcon} from '@sanity/icons/Play'
import {SparklesIcon} from '@sanity/icons/Sparkles'
import {UserIcon} from '@sanity/icons/User'
import {WrenchIcon} from '@sanity/icons/Wrench'
import {STATION_OPTIONS} from './schemaTypes/chillTrack'

// Tài liệu đơn (1 bản duy nhất, mở thẳng) — sanity.config.ts ẩn chúng khỏi nút "+ Tạo mới"
export const SINGLETON_TYPES = ['chillSettings', 'chillLegal', 'resume']

// Ba nhóm, mỗi nhóm xếp theo mức dùng: /chill vận hành (việc gần như ngày nào cũng đụng),
// /chill nội dung, rồi Portfolio
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.divider().title('Quán /chill · vận hành'),
      // Công tắc tính năng, thử thách chung, mẩu giấy hôm nay
      S.listItem()
        .title('Cài đặt')
        .id('chillSettings')
        .icon(ControlsIcon)
        .child(S.document().title('Cài đặt').schemaType('chillSettings').documentId('chillSettings')),
      // Góp ý người xem gửi từ khung Wishlist (tạo qua API, không tạo tay ở đây)
      S.listItem()
        .title('Wishlist')
        .id('chillWish')
        .icon(BulbOutlineIcon)
        .child(
          S.list()
            .title('Wishlist')
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
      // Mẩu giấy khách treo lên bảng nhật ký (tạo qua API; quán tự xoá sau 7 ngày)
      S.listItem()
        .title('Bảng nhật ký')
        .id('chillNote')
        .icon(PinIcon)
        .child(
          S.list()
            .title('Bảng nhật ký')
            .items(
              [
                ['shown', '📌 Đang treo', 'hidden != true'],
                ['reported', '🚩 Bị báo cáo', 'coalesce(reports, 0) > 0'],
                ['hidden', '🚫 Đã ẩn', 'hidden == true'],
                ['all', 'Tất cả', 'true'],
              ].map(([id, title, filter]) =>
                S.listItem()
                  .id(id)
                  .title(title)
                  .child(
                    S.documentTypeList('chillNote')
                      .title(title)
                      .filter(`_type == "chillNote" && ${filter}`)
                      .defaultOrdering([{field: '_createdAt', direction: 'desc'}])
                      .initialValueTemplates([]),
                  ),
              ),
            ),
        ),
      // Người xem bấm "I've sent it" ở mục Buy Bin a coffee và để lại lời nhắn
      S.listItem()
        .title('Supporters')
        .id('chillSupporter')
        .icon(HeartIcon)
        .child(
          S.list()
            .title('Supporters')
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

      S.divider().title('Quán /chill · nội dung'),
      // Nhạc thêm từ Studio (ngoài bộ có sẵn trong code), chia theo trạm cho dễ tìm khi playlist dài ra
      S.listItem()
        .title('Nhạc')
        .id('chillTrack')
        .icon(PlayIcon)
        .child(
          S.list()
            .title('Nhạc')
            .items([
              S.listItem()
                .title('Tất cả bài')
                .id('chillTrack-all')
                .child(
                  S.documentTypeList('chillTrack')
                    .title('Tất cả bài')
                    .defaultOrdering([{field: 'station', direction: 'asc'}, {field: 'order', direction: 'asc'}]),
                ),
              S.divider(),
              ...STATION_OPTIONS.map(({title, value}) =>
                S.listItem()
                  .title(title)
                  .id(`chillTrack-${value}`)
                  .child(
                    S.documentTypeList('chillTrack')
                      .title(title)
                      .filter('_type == "chillTrack" && coalesce(station, "lofi") == $station')
                      .params({station: value})
                      .defaultOrdering([{field: 'order', direction: 'asc'}]),
                  ),
              ),
            ]),
        ),
      S.documentTypeListItem('chillDestination').title('Điểm đến').icon(EarthGlobeIcon),
      // Nhật ký thay đổi: trùng tên nút "Có gì mới" trên trang /chill
      S.documentTypeListItem('chillUpdate').title('Có gì mới').icon(SparklesIcon),
      // /chill/terms và /chill/privacy
      S.listItem()
        .title('Điều khoản & riêng tư')
        .id('chillLegal')
        .icon(LockIcon)
        .child(S.document().title('Điều khoản & riêng tư').schemaType('chillLegal').documentId('chillLegal')),

      S.divider().title('Portfolio'),
      S.documentTypeListItem('post').title('Bài viết').icon(DocumentTextIcon),
      // Mục "What people say" trang chủ
      S.documentTypeListItem('testimonial').title('Lời giới thiệu').icon(CommentIcon),
      S.documentTypeListItem('tool').title('Công cụ').icon(WrenchIcon),
      // Danh sách bình thường (nhiều năm), không phải singleton
      S.documentTypeListItem('timelineYear').title('Timeline').icon(CalendarIcon),
      S.listItem()
        .title('Resume')
        .id('resume')
        .icon(UserIcon)
        .child(S.document().title('Resume').schemaType('resume').documentId('resume')),

      ...S.documentTypeListItems().filter(
        (listItem) => !['post', 'resume', 'tool', 'timelineYear', 'chillTrack', 'chillDestination', 'chillWish', 'chillSupporter', 'chillUpdate', 'chillSettings', 'chillNote', 'chillLegal', 'testimonial'].includes(listItem.getId() as string),
      ),
    ])
