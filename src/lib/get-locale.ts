import {DEFAULT_LOCALE, type Locale} from './i18n'

// Tính năng chuyển ngôn ngữ đã TẮT vĩnh viễn — luôn trả về DEFAULT_LOCALE,
// không đọc cookie nữa. Trước đây đọc cookie 'lang' do LanguageToggle set;
// giờ toggle đã gỡ nhưng cookie cũ (nếu ai từng bấm thử) vẫn còn tồn tại
// trong trình duyệt của họ tới 1 năm — đọc cookie sẽ khiến người đó bị kẹt
// vĩnh viễn ở ngôn ngữ họ chọn trước đó, dù DEFAULT_LOCALE đã đổi.
// Giữ nguyên tên hàm để các page.tsx không cần sửa lại chỗ gọi getLocale().
export async function getLocale(): Promise<Locale> {
  return DEFAULT_LOCALE
}
