# /chill — Ảnh thật cho cảnh bàn nhóm

Thay phần vẽ tạm bằng code trong `scene.ts` (`drawGroup`) bằng ảnh AI cùng quy trình với quầy cửa sổ:
**Nano Banana 2** cho ảnh tĩnh → **Kling** cho video loop → cắt thành sprite sheet.

## Cách ghép (để biết vì sao prompt viết như dưới)

```
Lớp 1  Nền bàn nhóm 1280×720       tường, cửa sổ nhỏ (khoét trong suốt), đèn, bàn dài, 4 GHẾ TRỐNG
Lớp 2  Sprite nhân vật (×6)         nửa người trên + laptop + mép bàn, nền xanh chroma → cắt trong suốt
                                    vẽ đè lên đúng ghế; ghế trống = không vẽ gì (nền đã có ghế)
Code   Phố qua cửa sổ, dây đèn bạn bè, bảng tên, nhãn "+n", tô màu theo giờ
```

Vì nhân vật có thể ngồi **bất kỳ ghế nào**, mỗi nhân vật chỉ làm một lần trên nền xanh, cùng khung hình, cùng góc nhìn. 4 ghế trên nền phải giống nhau (cùng kiểu ghế, cùng khoảng cách) để sprite đặt vào ghế nào cũng khớp.

## Ảnh tham chiếu (đính kèm cho mọi prompt Nano Banana)

- `public/chill/scenes/interior.webp`: phong cách, bảng màu, gỗ, độ chi tiết pixel
- Một khung của người ngồi ở quầy (cắt từ `public/chill/scenes/interior-loop@2x.webp`): tỉ lệ người, cách tô bóng tóc, áo

## Vùng an toàn của khung hình (theo kích thước đã đo trên trang)

| Vùng | Lý do |
|---|---|
| 12% trên cùng | bị thanh nút che |
| 15% dưới cùng, giữa màn | bị thanh nhạc che |
| Ngoài 75% bề ngang ở giữa (12,5% mỗi bên) | bị cắt mất trên màn 4:3 / iPad |

Mặt bàn khoảng **65% chiều cao**, đầu người khoảng **40–50% chiều cao**. 4 ghế nằm trong khoảng **30–80% bề ngang**. Cửa sổ nhỏ ở khoảng **10–28% bề ngang**.

---

## 1. Nền bàn nhóm: Nano Banana 2

Kích thước 1280×720 (16:9). Đính kèm 2 ảnh tham chiếu ở trên.

```
Detailed pixel art, same art style, palette and lighting as the reference café image:
native 640x360 pixel art upscaled 2x with nearest neighbor, crisp 1px dark brown
outlines, soft dithered shading, warm wood tones, cozy Vietnamese café interior.

Front view of the inside of the same café, looking at a back wall. A long wooden
communal table runs horizontally across the frame; the table top sits at about 65%
of the image height and spans from about 28% to 95% of the width. Behind the table,
four identical simple wooden café chairs, evenly spaced between 33% and 78% of the
width, all EMPTY, chair backs visible above the table edge. The table top is clear
in front of each chair (no laptops, no cups, no people).

On the left wall, a small square wooden window at about 10–28% of the width,
upper half of the image, with a cross-shaped mullion and a narrow wooden sill; the
glass area must be pure flat magenta #FF00FF so it can be cut out later.

A single green enamel pendant lamp hangs from the ceiling above the middle of the
table. A small framed picture on the right wall. Wood wainscoting along the lower
wall. Plain warm plaster wall elsewhere, leave the area just below the ceiling
empty (string lights will be drawn there in code).

Daytime soft light, no strong cast shadows, no people, no text, no logos.
Keep the bottom 15% of the image simple (table front and floor only).
```

**Sau khi có ảnh:** đưa mình file gốc. Mình khoét ô kính màu magenta thành trong suốt và đo lại toạ độ 4 ghế, cửa sổ, đèn để cập nhật `GROUP_SEATS` và các vùng trong `scene.ts`.

---

## 2. Nhân vật nhìn chính diện: Nano Banana 2 (×6)

Mỗi nhân vật 1 ảnh, **cùng khung hình** để ghép vào ghế nào cũng khớp. Tạo **nhân vật số 1 trước**. Khi đạt thì đính kèm ảnh đó làm tham chiếu "same framing, same proportions" cho 5 nhân vật còn lại.

Kích thước 1024×1024 (vuông, chừa lề để Kling chuyển động không bị cắt).

### Prompt chung (dán trước phần mô tả riêng)

```
Detailed pixel art character, exactly the same art style, outline weight and
shading as the reference café images (native low-res pixel art upscaled with
nearest neighbor). Front view, facing the viewer, a young person sitting at a
wooden café table, visible from the chest up behind an open silver laptop seen
from the BACK (lid facing the viewer, small round logo in the middle). The bottom
of the image is the front edge of the wooden table, perfectly horizontal and
running the full width. A small white coffee cup on the table to the right of the
laptop. Calm, focused expression, eyes looking down at the screen.
Character centered, head at about 35% of the image height, laptop lid covering
the lower torso. Solid flat chroma green background #00FF00 everywhere else,
no shadow on the background, no chair visible, no text.
```

### Mô tả riêng từng nhân vật (khớp `CHARACTERS` trong `table-view.ts`)

| # | Tên trong code | Thêm vào cuối prompt |
|---|---|---|
| 0 | Áo đỏ | `short black bob haircut, light warm skin, muted brick-red knit sweater` |
| 1 | Áo xanh lá | `short messy dark brown hair, tan skin, sage green hoodie with drawstrings` |
| 2 | Áo tím | `long straight black hair over the shoulders, fair skin, dusty purple cardigan over a white tee` |
| 3 | Áo xanh dương | `wavy chestnut hair tied in a low bun, medium-dark skin, denim blue shirt, round glasses` |
| 4 | Áo vàng | `buzz cut black hair, light warm skin, mustard yellow overshirt, small wired earbuds` |
| 5 | Áo hồng | `shoulder-length dark brown hair with a hair clip, tan skin, dusty rose sweatshirt` |

Giữ màu áo gần đúng như bảng trên, vì avatar tròn trên thanh nút và trong menu đang dùng đúng các màu đó.

---

## 3. Chuyển động: Kling (image-to-video)

Cùng cách làm với người ngồi ở quầy: một video loop, sau đó code cắt thành sprite sheet và dùng **đoạn giữa video cho hành động uống cà phê**.

- Ảnh đầu vào là ảnh nhân vật ở bước 2 (nền xanh).
- **Start frame = End frame = cùng ảnh đó** để video lặp không giật.
- Thời lượng 10 giây. Camera **đứng yên tuyệt đối**.

### 3a. Gõ máy + uống cà phê (bắt buộc, ×6)

```
Static locked-off camera, no zoom, no pan. The character keeps working on the
laptop: small natural typing motions, occasional blink, slight head tilt while
reading. Around the middle of the clip they pick up the white coffee cup with
their right hand, take a slow sip, and put it back in the same spot, then return
to typing. Subtle, calm movement only. The background stays solid flat chroma
green #00FF00 the whole time, no lighting change, no new objects. Pixel art
look preserved, no motion blur. The final frame matches the first frame.
```

Ghi lại khoảng giây bắt đầu và kết thúc lúc uống (ví dụ 4,2–7,0 giây). Code dùng mốc đó như `sip` của người ngồi ở quầy.

### 3b. Ngủ gật (làm sau, ×6)

Chỉ cần khi có trạng thái ngủ gật tự động. Hiện code chỉ gửi trạng thái đang làm / đi vắng.

```
Static locked-off camera. The character slowly gets drowsy: eyelids drop, head
nods forward twice, then rests tilted down in light sleep with gentle breathing,
then slowly lifts back up to the starting pose by the end. Background stays solid
flat chroma green #00FF00. Pixel art look preserved, no motion blur. The final
frame matches the first frame.
```

---

## 4. Giao file cho mình

Bỏ vào `public/chill/scenes/group/` (mình sẽ tạo thư mục khi ghép):

```
group-bg.png              nền 1280×720 (ô kính magenta, mình tự khoét)
char-0.png … char-5.png   ảnh tĩnh nền xanh (bước 2)
char-0.mp4 … char-5.mp4   video Kling (bước 3a), kèm mốc giây uống cà phê
```

Từ đó mình làm tiếp:
- cắt nền xanh;
- xuất sprite sheet `.webp` hai bản `hi` và `lo`, giống `interior-loop@2x.webp` và `interior-loop.webp`;
- căn mép bàn của sprite vào mặt bàn trên nền;
- thay `drawGroup` bằng ảnh thật.

## Lưu ý khi tạo

- **Nhất quán là quan trọng nhất.** Luôn đính kèm `interior.webp` và nhân vật số 1 làm tham chiếu. Nhân vật nào lệch phong cách (nét mảnh hơn, nhiều màu hơn, trông "vector") thì tạo lại, đừng cố sửa.
- **Mép bàn phải nằm ngang tuyệt đối** ở đáy ảnh nhân vật. Nếu bị nghiêng, mình không ghép khớp vào nền được.
- **Không để nhân vật có bóng đổ lên nền xanh**, vì bóng sẽ thành viền xanh bẩn khi cắt.
- **Nếu Kling làm trôi màu nền xanh** trong video, báo mình. Mình sẽ cắt theo khoảng màu thay vì một màu cố định.

---

## 4. Nền vách kính (lựa chọn "Vách kính" ở cảnh bàn nhóm): Nano Banana 2 edit

Sửa từ **ảnh nền gạch đã dùng (v3a)** để bàn, 4 ghế, ốp gỗ, sàn, cây hai bên giữ đúng chỗ, vì sprite nhân vật đặt theo toạ độ ghế cũ. 1K, 16:9. Code vẽ phố, mưa, sương, đèn đêm vào phần kính và vẽ nắng lên bàn (`drawGlassWall` / `drawGlassLight` trong `scene.ts`).

```
Edit this exact image. Keep EVERYTHING below the top edge of the wooden
wainscoting exactly as it is: the long table, the four empty chairs, the
wainscoting, the patterned floor, the two potted plants at the sides, same
positions, same pixel art style, same palette.

Replace the whole brick wall above the wainscoting with a floor-to-ceiling
café shop-front window: four tall glass panes separated by slim dark wooden
mullions, a thin horizontal wooden transom bar near the top, a wooden ceiling
beam at the very top and a narrow wooden sill on top of the wainscoting.
Remove the small window, the shelf with jars, the framed picture and the menu
board. Keep the green enamel pendant lamp hanging in the middle, now in front
of the glass.

All glass areas must be pure flat magenta #FF00FF (no reflections, no
gradient, nothing visible through the glass) so it can be cut out later.
Crisp 1px dark brown outlines, no people, no text.
```

**Sau khi có ảnh:** khoét magenta thành trong suốt → `public/chill/scenes/group/group-bg-glass.webp` (1280×720), đo lại vùng kính để chỉnh `GLASS` trong `scene.ts`.

---

## 5. Người qua đường sau vách kính

Xe, người đi bộ, chó: dùng lại atlas `public/chill/sprites.webp` của phố ở quầy (code vẽ ra sau kính, không cần ảnh mới).

**Anh shipper** (`public/chill/scenes/group/shipper.webp`, 4 khung 56×87: chạy · dừng · nghe điện thoại · cười). Làm 2 bước bằng Nano Banana 2, 21:9: (1) prompt dưới với ảnh tham chiếu `https://applebin.me/chill/sprites.webp` ra dáng xe và tư thế; (2) sửa ảnh đó sang áo, mũ, thùng giao hàng màu cam, có điện thoại kẹp trên tay lái, không logo, thêm khung đang chạy:

```
Pixel art sprite sheet based on the reference sprite atlas. Use EXACTLY the same
character: the delivery rider in a grey helmet, grey jacket and dark trousers on a
silver Honda Cub style motorbike with a tall stack of cardboard boxes strapped on
the back (the 4th sprite from the left in the reference). Same side view facing
RIGHT, same proportions, same pixel art style, same 1px dark outlines and palette.

Draw 4 frames in ONE horizontal row, evenly spaced, every frame the same size, the
motorbike at the same position and scale in every frame, wheels on the same baseline:
1. Stopped at the curb, engine off, left foot down on the ground, sitting upright,
   both hands on the handlebar.
2. Stopped, holding a smartphone to his ear with his right hand, other hand on the
   handlebar, smiling, mouth closed.
3. Same as frame 2 but talking, mouth open, eyebrows raised.
4. Same pose, laughing happily, head tilted back, eyes closed, phone still at his ear.

Solid flat chroma green #00FF00 background everywhere, no ground, no shadows, no
text, no frame borders.
```

Hậu kỳ: khoét nền xanh, khử ám xanh ở viền, thu cả dải về cao 92 px (bằng sprite `bike-boxes`), alpha cứng.

**Mẹ và bé** (`mom.webp`, 5 khung 41×68: đi ×3 · bé kéo tay chỉ trỏ · bé nhảy cẫng) và **cặp đôi** (`couple.webp`, 6 khung 66×66: đi ×4 · chỉ vào menu · nhún vai cười). Nano Banana 2, 21:9, ảnh tham chiếu atlas phố. Prompt mở đầu giống nhau:

```
Pixel art sprite sheet in EXACTLY the same style, scale, 1px dark outlines and
palette as the pedestrians in the reference sprite atlas (the walking people on the
right side of the reference). Side view, facing RIGHT.
```

rồi tả nhân vật + 6 khung (1–4 đi bộ, 5–6 hành động), nền xanh chroma, không chữ. Model hay trả khác số khung yêu cầu (mẹ và bé ra 5 khung, cặp đôi ra 2 hàng × 4) → cắt theo ô thực tế (`pack.py` trong ghi chú: khoét nền, khử ám xanh, thu cả bộ về cao 68 / 66 px = người đi bộ trong atlas).
