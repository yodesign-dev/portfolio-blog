#!/usr/bin/env python3
# Art mùa Noel của /chill, vẽ thêm trên art gốc, không dùng AI:
#   public/chill/cat-noel.webp                     atlas mèo quàng khăn, cùng toạ độ cat.webp
#   public/chill/scenes/<sheet>-noel@2x.webp       sheet người ngồi quàng khăn, cùng cấu trúc sheet gốc
#   public/chill/scenes/<sheet>-noel.webp          bản điện thoại
#   public/chill/scenes/<sheet>-glow.webp          quầng đèn ban đêm, ô ×1, cùng số khung bản ×2
#
#   python3 scripts/chill-noel-art.py cat
#   python3 scripts/chill-noel-art.py seat cafe-boy
#   python3 scripts/chill-noel-art.py santa-bike <ảnh Nano Banana>   ra scenes/group/santa-bike.webp, 4 khung như shipper
#   python3 scripts/chill-noel-art.py santa-walk <ảnh Nano Banana>   ra scenes/group/santa-walk.webp, 5 khung
#
# Sheet người ngồi: ô cuối là mặt nạ khoét ảnh nội thất. Khăn nằm ngoài vùng khoét cũ nên mặt nạ
# được nới ra đúng bằng khăn, ảnh nội thất giữ nguyên. Người giữ nguyên từng khung, chỉ vẽ khăn
# đè lên (trừ chỗ tay, ly đi ngang trước khăn).
# Cần Pillow, numpy.

import math
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public', 'chill')
SCENES = os.path.join(PUB, 'scenes')

K = '#1c1110'
BRICK, BRICK_D, BRICK_L = '#c22f2d', '#8a1f24', '#e8574a'
CREAM, CREAM_D = '#f4e8d2', '#cdbd9f'


# ---------- Mèo ----------

# Đầu mèo từng khung (px atlas, gốc là góc trái trên của khung): x0, x1, y0, y1, đo trên lưới.
# Khăn là một vòng ôm quanh đầu phía dưới, đầu vẽ đè lên nên khăn nằm đúng dưới cằm và sau gáy.
CAT_HEAD = {
    'sleep': (105, 165, 8, 66), 'stir': (100, 162, 10, 68), 'tail': (117, 174, 15, 70), 'look': (102, 162, 12, 66),
    'stretch-0': (118, 180, 12, 68), 'stretch-1': (84, 147, 75, 129), 'stretch-2': (72, 138, 66, 129), 'stretch-3': (112, 171, 10, 66),
    'groom-0': (86, 144, 10, 66), 'groom-1': (78, 132, 10, 58), 'groom-2': (75, 132, 10, 58), 'groom-3': (69, 135, 10, 62),
    'groom-4': (66, 126, 8, 58), 'groom-5': (90, 147, 8, 62),
    'paw-0': (45, 111, 12, 60), 'paw-1': (47, 108, 12, 60), 'paw-2': (42, 105, 15, 63), 'paw-3': (39, 102, 9, 60),
    'paw-4': (39, 102, 15, 69), 'paw-5': (48, 108, 12, 60),
    'stalk-0': (105, 156, 15, 72), 'stalk-1': (113, 162, 27, 90),
    'wiggle-0': (66, 120, 84, 147), 'wiggle-1': (69, 123, 90, 150), 'wiggle-2': (69, 123, 78, 138),
    'pounce-0': (120, 183, 12, 72), 'pounce-1': (192, 252, 12, 66), 'pounce-2': (129, 201, 66, 138), 'pounce-3': (132, 197, 27, 102),
    'hug-0': (168, 252, 24, 96), 'hug-1': (165, 246, 36, 90),
    'head-0': (84, 153, 18, 78), 'head-1': (108, 174, 12, 72), 'head-2': (102, 168, 12, 66),
}
# Hướng cổ (độ, 90 = xuống, 180 = trái), mặc định chếch về phía thân
CAT_NECK_DIR = {'paw-0': 100, 'paw-1': 100, 'paw-2': 100, 'paw-3': 100, 'paw-4': 100, 'paw-5': 100, 'hug-0': 150, 'hug-1': 160, 'pounce-1': 130, 'head-1': 95, 'stalk-0': 135, 'head-0': 125}
NECK_DIR = 112
NECK_SPAN = 74


def cat_frames():
    src = open(os.path.join(ROOT, 'src', 'components', 'chill', 'cat.ts'), encoding='utf-8').read()
    body = src[src.index('const FRAMES = {'):src.index('} satisfies Record')]
    return {m[0]: tuple(map(int, m[1:])) for m in re.findall(r"'?([\w-]+)'?: \[(\d+), (\d+), (\d+), (\d+), (-?\d+)\]", body)}


# Vẽ theo ô 2 px cho cùng ô pixel với thân mèo. Vòng khăn tính theo góc quanh đầu: to nhất ở giữa,
# thon dần và tối dần về hai đầu như đang vòng ra sau cổ, có một nếp gấp chạy dọc
def cat_scarf(cat, head, direction):
    w, h = cat.size
    x0, x1, y0, y1 = head
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    src = np.asarray(cat)
    out = src.copy()
    colors = {k: (*(int(v[i:i + 2], 16) for i in (1, 3, 5)), 255) for k, v in dict(K=K, R=BRICK, D=BRICK_D, L=BRICK_L, C=CREAM).items()}
    TH = 10.0  # bề dày giữa vòng, px atlas

    def polar(px, py):
        dx, dy = (px - cx) / rx, (py - cy) / ry
        r = math.hypot(dx, dy)
        ang = math.degrees(math.atan2(dy, dx)) % 360
        return r, (ang - direction + 180) % 360 - 180

    # Đuôi khăn thả từ vòng khăn xuống ngực, nằm dưới vòng
    a = math.radians(direction + 30)
    tx0, ty0 = cx + math.cos(a) * rx * 1.1, cy + math.sin(a) * ry * 1.1
    for gy in range(0, h, 2):
        for gx in range(0, w, 2):
            dx, dy = gx - tx0, gy - ty0
            if 0 <= dy <= 30 and abs(dx) <= 6:
                col = 'K' if abs(dx) > 4 or dy > 28 else 'C' if 18 <= dy <= 21 or dy >= 26 else 'D' if dx > 1 else 'R'
                out[gy:gy + 2, gx:gx + 2] = colors[col]
    for gy in range(0, h, 2):
        for gx in range(0, w, 2):
            r, off = polar(gx + 1, gy + 1)
            if abs(off) > NECK_SPAN or r < .85:
                continue
            f = math.cos(math.radians(off) * 90 / NECK_SPAN)
            band = (TH * (.42 + .58 * f)) / min(rx, ry)
            if r > 1 + band + 2.2 / min(rx, ry):
                continue
            if r > 1 + band:
                col = 'K'
            elif r > 1 + band * .46 and r < 1 + band * .46 + 2.2 / min(rx, ry):
                col = 'D'  # nếp gấp
            elif f < .32:
                col = 'D'
            elif r > 1 + band * .72 and off > -20:
                col = 'L' if f > .5 else 'R'
            else:
                col = 'R'
            out[gy:gy + 2, gx:gx + 2] = colors[col]
    # Đầu nằm trên khăn
    yy, xx = np.mgrid[0:h, 0:w]
    inside = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    out[inside & (src[..., 3] > 0)] = src[inside & (src[..., 3] > 0)]
    return Image.fromarray(out[:h, :w])


def build_cat():
    atlas = Image.open(os.path.join(PUB, 'cat.webp')).convert('RGBA')
    out = atlas.copy()
    for name, (x, y, w, h, _ax) in cat_frames().items():
        frame = atlas.crop((x, y, x + w, y + h))
        out.paste(cat_scarf(frame, CAT_HEAD[name], CAT_NECK_DIR.get(name, NECK_DIR)), (x, y))
    path = os.path.join(PUB, 'cat-noel.webp')
    out.save(path, 'WEBP', lossless=True, method=6)
    print(path, os.path.getsize(path))


# ---------- Người ngồi ----------

# Café anh: vòng khăn ôm cổ và đuôi vắt qua vai. Vai gần như đứng yên suốt đoạn lặp nên khăn đứng
# yên theo, đầu xoay phía trên. px của ô ×2
SEATS = {
    'cafe-boy': {
        'sheet': 'interior-loop', 'interior': 'interior.webp', 'cell': (422, 440), 'at_px': (858, 232),
        'hi': (10, 81), 'lo': (12, 121),
        'at': (149, 200),
        'tail': [(23, 16), (34, 16), (42, 37), (32, 41)],
        # Ly và tay đi ngang trước đầu khăn bên trái trong đoạn uống (khung ×2)
        'front': {'frames': ((19, 27),), 'x': (120, 184), 'y': (180, 250)},
        'glow': {'box': (110, 30, 312, 300), 'skip': (110, 175, 175, 300)},
    },
    'cafe-girl': {
        'sheet': 'interior-girl-loop', 'interior': 'interior-girl.webp', 'cell': (422, 440), 'at_px': (858, 232),
        'hi': (10, 81), 'lo': (12, 121),
        'at': (133, 207),
        'tail': [(12, 16), (23, 16), (20, 39), (9, 39)],
        'front': {'frames': ((28, 52),), 'x': (90, 178), 'y': (180, 260)},
        # Đuôi tóc buông trước khăn
        'hair': (215, 120, 300, 345),
        'glow': {'box': (110, 30, 312, 300), 'skip': (110, 175, 175, 300)},
    },
    'balcony': {
        'sheet': 'room-balcony-loop', 'interior': 'room-balcony.webp', 'cell': (538, 478), 'at_px': (742, 236),
        'hi': (10, 81), 'lo': (12, 121),
        'at': (238, 190),
        'tail': [(23, 16), (34, 16), (42, 37), (32, 41)],
        'front': {'frames': (), 'x': (0, 0), 'y': (0, 0)},
        'glow': {'box': (225, 40, 372, 215), 'skip': (0, 0, 0, 0)},
    },
    'desk': {
        'sheet': 'room-desk-loop', 'interior': 'room-desk.webp', 'cell': (406, 404), 'at_px': (874, 272),
        'hi': (10, 81), 'lo': (12, 121),
        'at': (138, 165),
        'tail': [(23, 16), (34, 16), (42, 37), (32, 41)],
        'front': {'frames': ((22, 30), (42, 50)), 'x': (120, 170), 'y': (150, 215)},
        'glow': {'box': (95, 0, 300, 280), 'skip': (0, 140, 190, 290)},
    },
}


def seat_scarf(cfg):
    S = 3
    W, H = 60, 46
    t = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(t)
    tail = cfg['tail']
    g.polygon([(x - 1 if i in (0, 3) else x + 1, y) for i, (x, y) in enumerate(tail)], fill=K)
    g.polygon(tail, fill=BRICK)
    # Sọc kem trên đuôi, song song với mép dưới
    (bx0, by0), (bx1, by1) = tail[3], tail[2]
    (ux0, uy0), (ux1, uy1) = tail[0], tail[3]
    for f, wd in ((.58, 2), (.74, 1)):
        ax, ay = ux0 + (ux1 - ux0) * f, uy0 + (uy1 - uy0) * f
        g.line([(ax, ay), (ax + (bx1 - bx0), ay + (by1 - by0))], fill=CREAM, width=wd)
    for i in range(0, 12, 2):
        px = bx0 + (bx1 - bx0) * i // 12
        py = by0 + (by1 - by0) * i // 12
        g.line([(px, py), (px, py + 3)], fill=CREAM_D, width=1)
    # Vòng khăn cuộn hai lớp: cuộn trên hẹp ôm cổ, cuộn dưới rộng tì lên vai, mép tròn như len dày
    g.ellipse([5, 5, 40, 20], fill=K)
    g.ellipse([9, 0, 35, 12], fill=K)
    g.ellipse([6, 6, 39, 19], fill=BRICK)
    g.ellipse([10, 1, 34, 11], fill=BRICK)
    g.arc([8, 2, 37, 13], 25, 155, fill=BRICK_D)
    g.arc([6, 9, 39, 19], 30, 150, fill=BRICK_D)
    g.arc([12, 2, 32, 10], 195, 300, fill=BRICK_L)
    g.arc([8, 8, 28, 18], 190, 250, fill=BRICK_L)
    # Vân len dọc theo từng cuộn
    for x in range(10, 37, 4):
        y = 14 - abs(x - 22) // 7
        g.line([(x, y), (x, y + 2)], fill=BRICK_D)
    for x in range(14, 32, 4):
        g.line([(x, 5), (x, 6)], fill=BRICK_D)
    cw, ch = cfg['cell']
    layer = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    layer.alpha_composite(t.resize((W * S, H * S), Image.NEAREST), cfg['at'])
    return layer


def cell_of(sheet, i, cols, cw, ch):
    return sheet.crop(((i % cols) * cw, (i // cols) * ch, (i % cols) * cw + cw, (i // cols) * ch + ch))


def paste_cell(sheet, i, cols, cw, ch, im):
    sheet.paste(im, ((i % cols) * cw, (i // cols) * ch))


def build_sheet(cfg, scarf2x, suffix, scale, cols, frames):
    src = '%s%s.webp' % (cfg['sheet'], '@2x' if scale == 2 else '')
    sheet = Image.open(os.path.join(SCENES, src)).convert('RGBA')
    cw, ch = cfg['cell'][0] * scale // 2, cfg['cell'][1] * scale // 2
    if scale == 2:
        scarf = scarf2x
    else:
        # Bản điện thoại: thu ½, viền giữ đặc để khoét mặt nạ không hở
        a = np.asarray(scarf2x.resize((cw, ch), Image.BOX)).copy()
        a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
        scarf = Image.fromarray(a)
    scarf_a = np.asarray(scarf)
    solid = scarf_a[..., 3] > 0
    out = sheet.copy()
    x0, x1 = (v * scale // 2 for v in cfg['front']['x'])
    y0, y1 = (v * scale // 2 for v in cfg['front']['y'])
    # Khung cuối của video = ô ngay trước mặt nạ; ô cuối là mặt nạ
    for i in range(frames):
        cell = np.asarray(cell_of(sheet, i, cols, cw, ch)).copy()
        keep = np.zeros(solid.shape, bool)
        t = i * 81 // frames
        if any(f0 <= t <= f1 for f0, f1 in cfg['front']['frames']):
            # Ly, tay: pixel sáng, không phải áo xanh đen, trong vùng trước khăn
            r, g, b, al = (cell[..., k].astype(int) for k in range(4))
            bright = (al > 0) & (r > 110) & (r > b + 8)
            box = np.zeros(solid.shape, bool)
            box[y0:y1, x0:x1] = True
            keep = np.asarray(Image.fromarray((bright & box & solid).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
        if 'hair' in cfg:
            hx0, hy0, hx1, hy1 = (v * scale // 2 for v in cfg['hair'])
            hair = (cell[..., 3] > 0) & (cell[..., :3].astype(int).mean(-1) < 48)
            hbox = np.zeros(solid.shape, bool)
            hbox[hy0:hy1, hx0:hx1] = True
            keep = keep | (hair & hbox)
        paint = solid & ~keep
        cell[paint] = scarf_a[paint]
        paste_cell(out, i, cols, cw, ch, Image.fromarray(cell))
    mask = np.asarray(cell_of(sheet, frames, cols, cw, ch)).copy()
    mask[solid] = (255, 255, 255, 255)
    paste_cell(out, frames, cols, cw, ch, Image.fromarray(mask))
    path = os.path.join(SCENES, '%s-noel%s.webp' % (cfg['sheet'], '@2x' if scale == 2 else ''))
    out.save(path, 'WEBP', quality=92, alpha_quality=100, method=6, exact=True)
    print(path, out.size, os.path.getsize(path))
    return out


# Quầng đèn: viền người sát ô kính, ba màu đèn dây. Lưu ở ×1, cảnh vẽ đè lúc trời tối
def build_glow(cfg, sheet2x):
    cols, frames = cfg['hi']
    cw, ch = cfg['cell']
    interior = Image.open(os.path.join(SCENES, cfg['interior'])).convert('RGBA')
    ax, ay = cfg['at_px']
    base_full = np.asarray(interior.crop((ax, ay, ax + cw, ay + ch)))
    base_a = base_full[..., 3] > 0
    base_rgb = base_full[..., :3].astype(int)
    mask = np.asarray(cell_of(sheet2x, frames, cols, cw, ch))[..., 3] > 0
    gw, gh = cw // 2, ch // 2
    out = Image.new('RGBA', (cols * gw, (frames // cols + 1) * gh), (0, 0, 0, 0))
    yy, xx = np.mgrid[0:ch, 0:cw]
    pick = ((xx + yy // 2) // 34) % 5
    COLORS = ((np.isin(pick, (0, 2, 4)), (255, 190, 110), 1.5), (pick == 1, (255, 90, 76), 1.3), (pick == 3, (110, 225, 150), 1.1))
    box = np.zeros((ch, cw), bool)
    bx0, by0, bx1, by1 = cfg['glow']['box']
    box[by0:by1, bx0:bx1] = True
    sx0, sy0, sx1, sy1 = cfg['glow']['skip']
    box[sy0:sy1, sx0:sx1] = False
    for i in range(frames):
        cell = np.asarray(cell_of(sheet2x, i, cols, cw, ch))[..., 3] > 0
        alpha = (base_a & ~mask) | cell
        pane = ~alpha
        near = np.zeros(alpha.shape, bool)
        for dx, dy in ((0, 1), (0, 2), (0, 3), (1, 0), (2, 0), (-1, 0), (-2, 0)):
            near |= np.roll(np.roll(pane, dy, 0), dx, 1)
        # Chỉ tóc, tai nghe, áo: bỏ cành lá, hoa, khung cửa cũng sát ô kính
        cell_rgb = np.asarray(cell_of(sheet2x, i, cols, cw, ch)).astype(int)
        rgb_now = np.where(cell[..., None], cell_rgb[..., :3], base_rgb)
        r_, g_, b_ = rgb_now[..., 0], rgb_now[..., 1], rgb_now[..., 2]
        person = (rgb_now.mean(-1) < 62) | ((r_ > 150) & (g_ > 120) & (b_ > 90) & (g_ >= b_) & (r_ - b_ < 110))
        edge = near & alpha & box & person & ~(g_ > r_ + 12)
        rgb = np.zeros((ch, cw, 3))
        al = np.zeros((ch, cw))
        for m, col, k in COLORS:
            g = np.asarray(Image.fromarray(((edge & m) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3.5))).astype(float) / 255
            g = np.clip(g * k * alpha, 0, .75)
            rgb = rgb * (1 - g[..., None]) + np.array(col) * g[..., None]
            al = al + g * (1 - al)
        rgb = np.where(al[..., None] > 0, rgb / np.maximum(al[..., None], 1e-3), 0)
        a = np.dstack((np.clip(rgb, 0, 255), al * 255)).astype(np.uint8)
        paste_cell(out, i, cols, gw, gh, Image.fromarray(a).resize((gw, gh), Image.BOX))
    path = os.path.join(SCENES, '%s-glow.webp' % cfg['sheet'])
    out.save(path, 'WEBP', quality=70, alpha_quality=70, method=6)
    print(path, out.size, os.path.getsize(path))


def build_seat(name):
    cfg = SEATS[name]
    scarf = seat_scarf(cfg)
    hi = build_sheet(cfg, scarf, '@2x', 2, *cfg['hi'])
    build_sheet(cfg, scarf, '', 1, *cfg['lo'])
    build_glow(cfg, hi)


# Ông già Noel xe máy, ảnh Nano Banana 2.1 từ shipper.webp: 3168×1344, nền xanh, 4 khung cách đều.
# Khung đầu vẽ sót râu và lệch màu thùng quà nên lấy đầu và thùng từ khung 2, cùng dáng ngồi ở trên
def key_green(im):
    a = np.asarray(im.convert('RGBA')).astype(int).copy()
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Chỉ nền xanh chói; thùng quà xanh thẫm giữ nguyên
    bg = (g > 170) & (r < 110) & (b < 110)
    a[bg] = 0
    # Khử viền xanh lem ngay sát nền
    near = np.asarray(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    spill = near & ~bg & (g > r + 20) & (g > b + 20)
    a[..., 1] = np.where(spill, (r + b) // 2, g)
    return Image.fromarray(a.astype(np.uint8))


def largest_part(solid):
    h, w = solid.shape
    seen = np.zeros(solid.shape, bool)
    best = np.zeros(solid.shape, bool)
    best_n = 0
    for sy, sx in zip(*np.nonzero(solid)):
        if seen[sy, sx]:
            continue
        part = [(sy, sx)]
        seen[sy, sx] = True
        for y, x in part:
            for ny in range(max(0, y - 1), min(h, y + 2)):
                for nx in range(max(0, x - 1), min(w, x + 2)):
                    if solid[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        part.append((ny, nx))
        if len(part) > best_n:
            best_n = len(part)
            best = np.zeros(solid.shape, bool)
            ys, xs = zip(*part)
            best[list(ys), list(xs)] = True
    return best


def build_santa_bike(raw_path):
    raw = key_green(Image.open(raw_path))
    # Mốc tính theo ảnh ½ cỡ (1584×672) rồi nhân đôi
    cuts = [0, 411, 800, 1195, 1584]
    cells = [raw.crop((cuts[i] * 2, 0, cuts[i + 1] * 2, 1344)) for i in range(4)]
    # Đầu + thùng quà của khung 2 sang khung 1
    dx = 395 * 2
    first = cells[0]
    for box in ((110 * 2, 10 * 2, 262 * 2, 182 * 2), (10 * 2, 135 * 2, 140 * 2, 378 * 2)):
        x0, y0, x1, y1 = box
        patch = raw.crop((x0 + dx, y0, x1 + dx, y1))
        first.paste((0, 0, 0, 0), box)
        first.alpha_composite(patch, (x0, y0))
    W, H, Z = 56, 87, 14.7
    out = Image.new('RGBA', (W * 4, H), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        # Mép phải bánh trước: chỉ xét các hàng bánh xe, thùng quà khung sau có thể lấn vào ô này
        bx = c.crop((0, 1000, c.width, 1344)).getbbox()
        # Bánh trước sát mép phải, đáy khung theo ảnh gốc
        crop = c.crop((bx[2] - int(W * Z), 1344 - int(H * Z) - 8, bx[2], 1344 - 8))
        a = np.asarray(crop.resize((W, H), Image.LANCZOS)).copy()
        a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
        a[~largest_part(a[..., 3] > 0)] = 0  # sót của khung bên cạnh
        out.paste(Image.fromarray(a), (i * W, 0))
    path = os.path.join(SCENES, 'group', 'santa-bike.webp')
    out.save(path, 'WEBP', lossless=True, method=6)
    print(path, out.size, os.path.getsize(path))


# Ông già Noel đi bộ vác bao quà (phố đường tàu). Ảnh AI có 6 khung nhưng 4 khung đi gần như một
# dáng, khung đầu sót râu, nên dựng lại bước đi từ khung 2: dang chân · chân khép (chân của khung 5)
# · dang chân đổi bên (lật chân quanh hông). Ra 5 ô: dang · khép · dang đổi bên · xem giấy · vẫy tay.
# Toạ độ theo ảnh ½ cỡ, căn khoá thắt lưng vào cùng một cột
def build_santa_walk(raw_path):
    raw = key_green(Image.open(raw_path))
    half = raw.resize((1584, 672), Image.NEAREST)
    HEM = 414
    TOP, BOTTOM = 18, 662
    L, R = 200, 112  # bề rộng về hai bên khoá thắt lưng
    def cell(buckle):
        return half.crop((buckle - L, TOP, buckle + R, BOTTOM))
    stride = cell(463)
    stand = cell(1212)
    stand.paste((0, 0, 0, 0), (L + 94, 0, L + R, stand.height))  # bao quà của khung sau lấn vào
    wave = cell(1462)
    hem = HEM - TOP
    def with_legs(legs):
        out = stride.copy()
        a = np.asarray(out).copy()
        # Giữ bàn tay buông ở bên phải, xoá phần chân cũ
        keep_hand = np.zeros(a.shape[:2], bool)
        keep_hand[hem:hem + 26, L + 18:] = True
        a[hem:][~keep_hand[hem:]] = 0
        out = Image.fromarray(a)
        out.alpha_composite(legs.crop((0, hem, legs.width, legs.height)), (0, hem))
        return out
    closed = with_legs(stand)
    # Lật chân quanh hông (cách khoá thắt lưng 20 về sau)
    hip = L - 20
    mirrored = stride.crop((0, hem, stride.width, stride.height)).transpose(Image.FLIP_LEFT_RIGHT)
    legs = Image.new('RGBA', stride.size, (0, 0, 0, 0))
    legs.alpha_composite(mirrored, (0, hem))
    legs = legs.transform(legs.size, Image.AFFINE, (1, 0, stride.width - 2 * hip, 0, 1, 0), Image.NEAREST)
    other = with_legs(legs)
    frames = [stride, closed, other, stand, wave]
    W, H = 40, 68
    out = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        a = np.asarray(f.resize((W, H), Image.LANCZOS)).copy()
        a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
        a[~largest_part(a[..., 3] > 0)] = 0
        out.paste(Image.fromarray(a), (i * W, 0))
    path = os.path.join(SCENES, 'group', 'santa-walk.webp')
    out.save(path, 'WEBP', lossless=True, method=6)
    print(path, out.size, os.path.getsize(path))


if __name__ == '__main__':
    if sys.argv[1:2] == ['cat']:
        build_cat()
    elif sys.argv[1:2] == ['santa-bike']:
        build_santa_bike(sys.argv[2])
    elif sys.argv[1:2] == ['santa-walk']:
        build_santa_walk(sys.argv[2])
    elif sys.argv[1:2] == ['seat']:
        build_seat(sys.argv[2])
    else:
        sys.exit(__doc__ or 'cat | seat <tên>')
