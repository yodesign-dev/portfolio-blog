#!/usr/bin/env python3
# Vá viền trái nắp laptop của người ngồi nữ (/chill) ở mọi phòng có laptop.
#
# - Cửa sổ quán: ảnh tĩnh interior-girl.webp có viền đúng (vạch sáng thẳng, nét tối ngoài cùng),
#   nhưng từ bản đầu (6cb6a4e) mỗi khung video có pixel tối đặc đè lên vạch đó ở y 498–519 và
#   528–536 (px 1280) và xoá nét tối ngoài ở y 465–518. Khung lấy lại dải viền của ảnh tĩnh.
# - Bàn đêm: ảnh Nano vẽ viền dày 3 px tới y 499 rồi chỉ còn 1 px xám mờ tới góc dưới, ở cả ảnh
#   tĩnh lẫn mọi khung. Chép hàng còn nguyên ngay phía trên (y 496) xuống đoạn đứt, cho ảnh tĩnh
#   và cho từng khung (khung ghép đúng như scene.ts vẽ rồi ghi lại dạng đặc, nên mặt nạ / chỗ
#   trong suốt không lộ lỗ).
# Không ai đi ngang dải viền này (tay ở bàn phím, ly ở bên phải), nên vá như nhau cho mọi khung,
# cả sheet thường lẫn Noel, màn rộng (×2) lẫn điện thoại (×1).
#
#   python3 scripts/chill-girl-laptop-edge.py [--room cafe|desk]
#
# Sửa tại chỗ trong public/chill/scenes; chạy lại không vẽ chồng (nguồn vá nằm ngoài đoạn vá).
# Đổi file xong thì tăng `?v=` của các đường dẫn đó trong themes.ts: service worker của /chill
# (public/chill-sw.js) trả tranh đã lưu trước rồi mới tải bản mới, nên không đổi URL thì khách cũ
# vẫn thấy tranh cũ ở lần mở đầu. Cần numpy, Pillow.

import argparse
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = os.path.join(ROOT, 'public', 'chill', 'scenes')
BG = np.array([26, 21, 32], float)  # nền canvas của scene.ts

ROOMS = {
    'cafe': {
        'interior': 'interior-girl.webp',
        'at': (858, 232, 422, 440),  # themes.ts girl `character.at` × 2, px 1280
        'band': (858, 868, 428, 538),  # x0, x1, y0, y1 (px 1280)
        'from': 'still',  # dải viền lấy từ ảnh tĩnh (ảnh tĩnh không sửa)
        'sheet': 'interior-girl-loop',
    },
    'desk': {
        'interior': 'room-desk-girl.webp',
        'at': (858, 262, 422, 414),
        'band': (862, 866, 500, 538),
        'from': 496,  # chép hàng này xuống cả dải (ảnh tĩnh cũng vá)
        'sheet': 'room-desk-girl-loop',
    },
}
# hậu tố, tỉ lệ so với px 1280, số cột, số khung, chất lượng webp (như lúc tạo sheet)
SHEETS = [('@2x', 1, 10, 81, 88), ('', 2, 12, 121, 88), ('-noel@2x', 1, 10, 81, 92), ('-noel', 2, 12, 121, 92)]


def load(name):
    return np.asarray(Image.open(os.path.join(SCENES, name)).convert('RGBA')).astype(float)


def save(a, name, q):
    path = os.path.join(SCENES, name)
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8)).save(
        path, 'WEBP', quality=q, alpha_quality=100, method=6, exact=True)
    print(name, os.path.getsize(path))


def shrink(a, d):
    if d == 1:
        return a
    h, w = a.shape[0] // d, a.shape[1] // d
    return a[:h * d, :w * d].reshape(h, d, w, d, a.shape[2]).mean((1, 3))


def fix(room):
    cfg = ROOMS[room]
    interior = load(cfg['interior'])
    orig = interior.copy()
    x0, x1, y0, y1 = cfg['band']
    if cfg['from'] != 'still':
        interior[y0:y1, x0:x1] = interior[cfg['from'], x0:x1]
        save(interior, cfg['interior'], 90)

    ax, ay, aw, ah = cfg['at']
    for suffix, d, cols, frames, q in SHEETS:
        name = cfg['sheet'] + suffix + '.webp'
        sheet = load(name)
        cw, ch = aw // d, ah // d
        cx0, cx1 = (x0 - ax) // d, -(-(x1 - ax) // d)
        cy0, cy1 = (y0 - ay) // d, -(-(y1 - ay) // d)
        if cfg['from'] == 'still':
            # dải viền của ảnh tĩnh, thu về cỡ sheet
            still = shrink(orig[ay:ay + ah, ax:ax + aw], d)[cy0:cy1, cx0:cx1]
        else:
            sy = (cfg['from'] - ay) // d
            mask = sheet[(frames // cols) * ch:(frames // cols) * ch + ch,
                         (frames % cols) * cw:(frames % cols) * cw + cw, 3] / 255
            under = shrink(orig[ay:ay + ah, ax:ax + aw], d)
            under[..., 3] *= 1 - mask
        for i in range(frames):
            r, c = (i // cols) * ch, (i % cols) * cw
            cell = sheet[r:r + ch, c:c + cw]
            if cfg['from'] == 'still':
                cell[cy0:cy1, cx0:cx1, :3] = still[..., :3]
            else:
                fa, ua = cell[..., 3:4] / 255, under[..., 3:4] / 255
                comp = cell[..., :3] * fa + (under[..., :3] * ua + BG * (1 - ua)) * (1 - fa)
                cell[cy0:cy1, cx0:cx1, :3] = comp[sy, cx0:cx1]
            cell[cy0:cy1, cx0:cx1, 3] = 255
        save(sheet, name, q)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--room', choices=list(ROOMS))
    args = ap.parse_args()
    for room in ROOMS:
        if not args.room or args.room == room:
            fix(room)


if __name__ == '__main__':
    main()
