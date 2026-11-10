# Hướng dẫn template Notion · bản 2.0

Hai bản cùng cấu trúc, khác ngôn ngữ:

- `hanoi-cafe-workspace.md`: tiếng Anh, cho Gumroad, Notion Marketplace (listing "Lo-fi Café Workspace"), Reddit
- `goc-lam-viec-ha-noi.md`: tiếng Việt, cho nhóm Facebook, Threads, TikTok Việt Nam

Từ bản 2.0, **trang Notion mới là bản gốc**. Hai file `.md` chỉ là bản lưu: ghi nội dung chữ và schema để dựng lại nếu trang hỏng. Không nhập lại file `.md` vào Notion, vì Markdown không mang được database, view, công thức và nút.

## 1. Cấu trúc bản 2.0 (dựng ngày 29/10/2026)

| Trang | Tiếng Anh | Tiếng Việt |
| --- | --- | --- |
| Trang chính | Hanoi Café Workspace | Hanoi Café Workspace · Tiếng Việt |
| Hướng dẫn 2 phút + bảng dữ liệu mẫu | 👋 Start here | 👋 Bắt đầu ở đây |
| Roadmap, backlog, tài liệu | 🧭 Product Desk | 🧭 Bàn sản phẩm |
| 4 database gốc | 🗃 Back of house | 🗃 Sau quầy |

Database: Tasks / Việc, Phin Log / Nhật ký phin, Projects / Dự án, Docs / Tài liệu. Schema đầy đủ nằm trong 2 file `.md`.

Hai bảng cũ của bản 1.1 (Phin hôm nay, Tuần này) đã chuyển sang trang riêng tư "Archive · Hanoi Café v1.1 tables" trong workspace, không nằm trong template. Xoá trang đó khi bản 2.0 đã ổn.

## 2. Việc cần làm tay trong Notion

Kết nối Notion của Claude không tạo được nút và database template, nên mấy bước này làm trong app (mỗi bước khoảng 1 phút, làm ở cả hai bản):

1. **Nút ☕ Start a phin / Bắt đầu pha** trong Tasks (Việc): Add property → Button → Add page to *Phin Log*, đặt Task = This page, Brewed at = Now → thêm bước Edit property Status = Brewing (Đang pha).
2. **Nút Done ✓ / Xong ✓** trong Tasks: Add property → Button → Edit property Status = Done (Xong).
3. **Thứ tự nhóm trong Today / Hôm nay:** kéo nhóm Top 3 (Việc chính) lên trên Small thing (Việc nhỏ).
4. **Tuỳ chọn, database template cho Docs:** mở Docs → mũi tên cạnh New → + New template, dán nội dung từ các tài liệu Blank / trống. Làm xong thì xoá 4 tài liệu trống và sửa câu "duplicate the matching Blank doc" trong Product Desk và Bắt đầu ở đây.
5. **Không dùng biểu đồ (chart view).** Gói Free của Notion chỉ cho 1 biểu đồ mỗi workspace, workspace của Bin đã dùng hết, và người nhân bản có thể cũng vậy. "Week in phins" và "Tuần này bao nhiêu phin" là board nhóm theo ngày; biểu đồ trong Product Desk đã bỏ (29/10/2026).

Lưu ý giới hạn Notion: không rollup được một rollup. Vì vậy Projects cộng **Focus hours** (công thức) của từng việc, không cộng trực tiếp số phin.

## 3. Dữ liệu mẫu cũ dần

Phin mẫu đặt trong 23 đến 29/10/2026. Sau một tuần, bảng 7 ngày của người mới nhân bản sẽ trống. Mỗi lần đăng cập nhật lớn, đổi ngày phin mẫu cho gần ngày đăng (sửa cột Brewed at / Pha lúc trong bảng dữ liệu mẫu).

## 4. Ảnh

Ảnh bìa và ảnh Gumroad trong `covers/` và `gumroad/` vẫn dùng được (phần đầu trang không đổi). Cần chụp thêm cho bản 2.0:

- [x] Ảnh trang chính có Today, Phin hôm nay và bảng phin theo ngày: `v2.0/home-en.jpg`, `v2.0/today-en.jpg`, `v2.0/phins-week-en.jpg`
- [x] Ảnh Product Desk: `v2.0/product-desk-en.jpg`, bản Việt `v2.0/ban-san-pham-vi.jpg`
- [ ] Ảnh một PRD mẫu
- [ ] Video 20 giây: bấm ▶, thêm một phin, cột Cups đầy thêm một ly
- [ ] `public/chill/og.jpg` của trang quán (còn từ bản 1.1)

Ảnh bản 1.0 (phố cũ, chưa có tàu) để ở `_v1.0/`.

## 5. Cập nhật trang đã đăng

Sửa thẳng trên 2 trang Notion đã publish, đừng tạo trang mới: link công khai giữ nguyên. Trang tiếng Anh đồng thời là listing "Lo-fi Café Workspace" trên Notion Marketplace, nên mở listing xem lại sau mỗi lần sửa lớn.

## 6. Mở cho người khác nhân bản

1. Góc phải trên → **Share** → tab **Publish** → **Publish**.
2. Bật **Allow duplicate as template**.
3. Copy link công khai. Đây là link đưa lên mọi nơi.

## 7. Đưa lên đâu

| Nơi | Ghi chú |
| --- | --- |
| Gumroad | Miễn phí (giá 0+), dán link Notion vào phần nội dung sau khi tải. Gửi email cập nhật bản 2.0 cho người đã tải. 29/10/2026: đã đổi tên và mô tả; email 9c lưu nháp vì Gumroad chỉ cho gửi email khi đạt $100 doanh thu và đã nhận payout |
| Notion Marketplace | Listing "Lo-fi Café Workspace". Thêm danh mục Work → Product và Operations, thay ảnh có Product Desk. 29/10/2026: đã thay mô tả, thêm ảnh xem trước Product Desk, gửi duyệt (danh mục không sửa được khi đã publish) |
| Gridfiti | Gửi giới thiệu qua trang liên hệ của họ |
| TikTok, Reels | Video 20 giây ở mục 4 |
| Nhóm Facebook, Threads | Bản tiếng Việt, kèm ảnh Bàn sản phẩm |

Bài đăng có sẵn trong `bai-dang.md`, mục 9 là bản 2.0.

## 8. Theo dõi hiệu quả

- **Vercel Analytics → Events → `Chill Embed`:** `view`, `play`, `open`, cột `host` cho biết khung nằm ở đâu (`www.notion.so`, `*.notion.site`). Khung trong Product Desk dùng `?place=dalat&station=focus`; sự kiện chưa ghi `place`, nên chưa tách được khung nào.
- **UTM:** mọi link về quán có `utm_source=notion&utm_medium=template` và `utm_content` theo chỗ đặt:

| `utm_content` | Chỗ đặt |
| --- | --- |
| `home` | Lời chào đầu trang chính |
| `phins` | Cạnh Phin hôm nay |
| `end-of-day` | Lời mời viết lên tường nhật ký |
| `start-here` | Bước 2 trong Start here |
| `retro` | Cuối mỗi retro |
| `footer` | Dòng ghi công |

`utm_campaign`: `hanoi-cafe-workspace` cho bản tiếng Anh, `chill-for-work-template` cho bản tiếng Việt (giữ theo trang đang chạy từ bản 1.1).

- **Sau bản 2.0:** so lượt `open` và lượt bấm theo `utm_content` 2 tuần trước và sau ngày đăng thông báo.
