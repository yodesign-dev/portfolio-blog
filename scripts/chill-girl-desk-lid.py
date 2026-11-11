#!/usr/bin/env python3
# Vá viền trái nắp laptop ở phòng Bàn đêm, bản nữ (/chill).
#
# Ảnh Nano của chị vẽ lại laptop: viền trái nắp là vạch sáng dày 3 px (x 862–864, px 1280) từ
# góc trên xuống y 499, nhưng đoạn y 500–537 chỉ còn 1 px xám mờ nên nhìn như mất pixel (bản nam
# liền). Không ai đi ngang dải này, nên mỗi khung chép lại hàng sáng ngay phía trên (y 496) xuống
# đoạn đứt. Khung được ghép đúng như scene.ts vẽ (màn dưới ảnh nội thất, nội thất khoét mặt nạ,
# khung người đè lên) rồi ghi lại dải đã vá dạng đặc, nên mặt nạ / chỗ trong suốt không lộ lỗ.
#
#   python3 scripts/chill-girl-desk-lid.py
#
# Sửa tại chỗ room-desk-girl.webp và 4 sheet room-desk-girl-loop{,-noel}{,@2x}.webp. Chạy lại không
# đổi gì thêm (dải nguồn nằm ngoài đoạn vá). Cần numpy, Pillow.

import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = os.path.join(ROOT, 'public', 'chill', 'scenes')
AT = (858, 262, 422, 414)  # themes.ts desk girl `character.at` × 2, px 1280
X0, X1 = 862, 866  # vạch sáng + 1 px viền tối bên trong
SRC_Y = 496  # hàng còn nguyên ngay trên đoạn đứt
Y0, Y1 = 500, 538  # đoạn đứt, tới góc dưới (y 538 viền đã lượn sang phải)
SHEETS = [
    # tên, tỉ lệ so với px 1280, số cột, số khung, chất lượng webp (như lúc tạo)
    ('room-desk-girl-loop@2x.webp', 1, 10, 81, 88),
    ('room-desk-girl-loop.webp', 2, 12, 121, 88),
    ('room-desk-girl-loop-noel@2x.webp', 1, 10, 81, 92),
    ('room-desk-girl-loop-noel.webp', 2, 12, 121, 92),
]


def load(name):
    return np.asarray(Image.open(os.path.join(SCENES, name)).convert('RGBA')).astype(float)


def save(a, name, q):
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8)).save(
        os.path.join(SCENES, name), 'WEBP', quality=q, alpha_quality=100, method=6, exact=True)
    print(name, os.path.getsize(os.path.join(SCENES, name)))


def main():
    interior = load('room-desk-girl.webp')
    orig = interior.copy()
    # Ảnh tĩnh (hiện trong lúc sheet chưa tải)
    interior[Y0:Y1, X0:X1] = interior[SRC_Y, X0:X1]
    save(interior, 'room-desk-girl.webp', 90)

    ax, ay, aw, ah = AT
    for name, d, cols, frames, q in SHEETS:
        sheet = load(name)
        cw, ch = aw // d, ah // d
        # toạ độ dải trong ô (px của sheet)
        cx0, cx1 = (X0 - ax) // d, -(-(X1 - ax) // d)
        sy, cy0, cy1 = (SRC_Y - ay) // d, (Y0 - ay) // d, -(-(Y1 - ay) // d)
        mi = frames
        mask = sheet[(mi // cols) * ch:(mi // cols) * ch + ch, (mi % cols) * cw:(mi % cols) * cw + cw, 3] / 255
        # nội thất (ảnh gốc, chưa vá) thu về cỡ sheet, đã khoét mặt nạ — đúng thứ hiện dưới khung
        reg = orig[ay:ay + ah, ax:ax + aw]
        if d == 2:
            reg = reg.reshape(ch, 2, cw, 2, 4).mean((1, 3))
        under = reg.copy()
        under[..., 3] *= 1 - mask
        for i in range(frames):
            r, c = (i // cols) * ch, (i % cols) * cw
            cell = sheet[r:r + ch, c:c + cw]
            fa = cell[..., 3:4] / 255
            ua = under[..., 3:4] / 255
            # màn laptop vẽ dưới cùng nhưng dải này nằm ngoài lòng màn: nền tối của canvas
            comp = cell[..., :3] * fa + (under[..., :3] * ua + np.array([26, 21, 32]) * (1 - ua)) * (1 - fa)
            src = comp[sy, cx0:cx1]
            cell[cy0:cy1, cx0:cx1, :3] = src
            cell[cy0:cy1, cx0:cx1, 3] = 255
        save(sheet, name, q)


if __name__ == '__main__':
    main()
