# Hướng dẫn dựng và chia sẻ template Notion · bản 1.1

Hai bản giống nhau về nội dung:

- `goc-lam-viec-ha-noi.md`: tiếng Việt, cho nhóm Facebook, Threads, TikTok Việt Nam
- `hanoi-cafe-workspace.md`: tiếng Anh, cho Gumroad, Notion Marketplace, Reddit

## 1. Nhập vào Notion (khoảng 5 phút mỗi bản)

1. Notion → thanh bên trái → **Import** → **Text & Markdown** → chọn file `.md`.
2. Tìm dòng "👉 KHUNG QUÁN" ở đầu trang, xoá nó, gõ `/embed`, dán `https://applebin.me/chill/embed`, bấm **Embed link**.
3. Kéo góc dưới khung cho cao khoảng 300–360px. Rộng hết trang thì sẽ hiện thêm các nút trạm nhạc.
4. **Add cover:** dùng ảnh phố đường tàu có tàu đang chạy qua (xem mục 1b). **Add icon:** ☕.
5. **Bắt buộc từ bản 1.1:** hai bảng "Phin hôm nay" và "Tuần này" nhập vào là bảng thường, ô ☐ không bấm được. Chọn từng bảng → **Turn into database** → đổi cột "Xong" sang **Checkbox**, cột "Phút" sang **Select** với 3 lựa chọn 15, 25, 45. Người tải template mong ô tick bấm được ngay, Notion Marketplace cũng duyệt khắt hơn với bảng tĩnh.
6. Bảng "Đổi chỗ ngồi" để nguyên là bảng thường, không cần database.
7. Phần "Có gì mới ở bản 1.1" ở cuối trang: chọn khối → **Turn into → Toggle** để thu gọn, đặt tên "🆕 Có gì mới ở bản 1.1".
8. Tuỳ chọn: chuyển phần "Hôm nay" và "Phin hôm nay" thành 2 cột bằng cách kéo khối sang bên phải. Bản nhập từ Markdown không giữ được cột.

## 1b. Ảnh cần chụp lại cho bản 1.1

Ảnh bìa và ảnh Gumroad cũ vẫn là phố Hà Nội trước đây, không có đường tàu. Chụp lại ở applebin.me/chill/record hoặc chụp màn hình khung nhúng, chờ lúc tàu đang ở giữa khung:

- [x] 4 ảnh bìa trong `covers/` (sáng mưa, chiều, tối, tối mưa)
- [x] `gumroad/gumroad-cover.png`, `gumroad-thumbnail.png`, `gumroad-preview.png`
- [x] GIF 8 giây tàu chạy qua: `gumroad/train-pass.gif` (bản MP4 cùng tên cho Threads, Reels)
- [ ] `public/chill/og.jpg` của trang quán

Ảnh bản 1.0 (phố cũ, chưa có tàu) để ở `_v1.0/`.

## 1c. Cập nhật trang đã đăng (không đổi link)

Sửa thẳng trên 2 trang Notion đã publish, đừng nhập file mới thành trang mới: link công khai giữ nguyên, người đã lưu link không bị lạc. Thay nội dung theo 2 file `.md` mới, khung nhúng giữ nguyên.

## 2. Mở cho người khác nhân bản

1. Góc phải trên → **Share** → tab **Publish** → **Publish**.
2. Bật **Allow duplicate as template**.
3. Copy link công khai. Đây là link bạn đưa lên mọi nơi.

## 3. Đưa lên đâu

| Nơi | Ghi chú |
| --- | --- |
| Gumroad | Đăng miễn phí (giá 0+), dán link Notion vào phần nội dung sau khi tải. Gumroad có mục khám phá riêng, người tìm "notion lofi" sẽ thấy |
| Notion Marketplace | notion.com/templates → Submit a template. Được duyệt thì có khách đều |
| Gridfiti | Gửi giới thiệu qua trang liên hệ của họ, họ từng giới thiệu khung quán cà phê ảo của Flocus |
| TikTok, Reels | Quay màn hình 15 giây: mở trang Notion, bấm Play, bật mưa. Chữ trên video: "Notion của mình có quán cà phê Hà Nội" |
| Nhóm Facebook, Threads | Bản tiếng Việt, kèm ảnh chụp trang |

## 4. Theo dõi hiệu quả

- **Vercel Analytics → Events → `Chill Embed`:** `view` là số lần khung hiện lên, `play` là số lần bấm phát, `open` là số lần bấm sang quán. Cột `host` cho biết khung nằm ở đâu, ví dụ `www.notion.so`.
- **Sau bản 1.1:** so `Chill Embed` trước và sau ngày đăng thông báo cập nhật, Lưu ý: khung nhúng hiện chưa ghi lại `?place=` nào được dùng, nên chưa biết người ta có đổi chỗ ngồi không. Muốn biết thì cần thêm `place` vào sự kiện `Chill Embed`.
- **Referrers / UTM:** link ghi công ở cuối template có `utm_source=notion`, nên lượt bấm từ đó sẽ hiện riêng.
