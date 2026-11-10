#!/usr/bin/env python3
# Vẽ lại bàn tay gõ phím của người ngồi phòng Café window (/chill), cả anh lẫn chị.
#
# Video Kling vẽ bàn tay trên bàn phím thành một cục nhoè, không thấy ngón. Script này, trên
# từng khung của 8 sheet (anh / chị × thường / Noel × hi ×2 / lo ×1):
#   1. tìm cục da tay trên bàn phím (khung đang ghép đúng như scene.ts vẽ: nội thất đã khoét
#      mặt nạ + khung người), xoá nó cùng viền nâu, vá lại bằng bàn phím sạch;
#   2. đặt bàn tay mới bám theo cổ tay của khung đó; tay áo trong khung vẫn đè lên cổ tay.
#      --hand desk (mặc định): bàn tay của khung cùng thời điểm trong video Bàn đêm của chị, nên
#      hai phòng gõ phím bằng cùng một bàn tay, cùng nhịp (xem desk_hands). Anh mượn tay chị (thu
#      0,8, màu da anh) và Bàn đêm của anh cũng được thay theo (process_desk_sheet, --room).
#      --hand nano: bàn tay Nano Banana 2 vẽ (scripts/chill-hand-girl.png),
#      đốt tay nhấp nhô theo nhịp gõ tính bằng giây.
# Khung chị đưa tay lên cầm ly thì để nguyên tay, chỉ dọn viền nâu "bóng ma" còn trên bàn phím.
#
# Bàn phím sạch lấy từ các khung chị cầm ly (tay rời bàn phím); anh và chị cùng một laptop, bản
# anh chỉ bù lệch màu. Phần bàn phím bị che ở mọi khung: mỗi hàng phím lấy màu giữa của đoạn còn
# thấy ngay sau mép bạc.
#
#   python3 scripts/chill-hands-art.py [--rev 5dcf719] [--only girl] [--hand desk|nano]
#                                      [--sheet <tên sheet>] [--out <thư mục xem thử>]
#
# Luôn đọc sheet gốc từ git (--rev, mặc định 5dcf719 = trước khi vẽ lại tay) nên chạy lại không
# vẽ chồng. Ghi đè public/chill/scenes/*.webp (hoặc --out). Cần numpy, Pillow.

import argparse
import io
import os
import subprocess
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = 'public/chill/scenes'
# Vùng người ngồi (themes.ts cafe `character.at` × 2), px 1280
AT = (858, 232, 422, 440)
# Vùng bàn tay trong ô ×2 (x0, y0, x1, y1) và lòng màn laptop (code vẽ màn — để trong suốt)
Z = (20, 280, 200, 360)
SCREEN = (14, 206, 190, 304)

SHEETS = {
    'boy': {
        'interior': 'interior.webp',
        'sheets': [
            ('interior-loop@2x.webp', 2, 10, 81, 8),
            ('interior-loop.webp', 1, 12, 121, 12),
            ('interior-loop-noel@2x.webp', 2, 10, 81, 8),
            ('interior-loop-noel.webp', 1, 12, 121, 12),
        ],
    },
    'girl': {
        'interior': 'interior-girl.webp',
        'sheets': [
            ('interior-girl-loop@2x.webp', 2, 10, 81, 8),
            ('interior-girl-loop.webp', 1, 12, 121, 12),
            ('interior-girl-loop-noel@2x.webp', 2, 10, 81, 8),
            ('interior-girl-loop-noel.webp', 1, 12, 121, 12),
        ],
    },
}
# Khung chị cầm ly (giây, sheet hi 8 fps): tay rời bàn phím
GIRL_SIP_HI = range(34, 47)

# ---------------------------------------------------------------- bàn tay pixel

PAL = {
    'boy': dict(ol=(62, 26, 14), sh=(196, 104, 64), base=(226, 128, 82), li=(244, 160, 108), hi=(250, 196, 146)),
    'girl': dict(ol=(88, 48, 34), sh=(206, 132, 90), base=(236, 168, 116), li=(249, 186, 134), hi=(252, 212, 170)),
}
SCALE = {'boy': 0.8, 'girl': 1.0}
# Nhịp gõ: [trỏ, giữa, áp út, út] — 1 = ngón đang nhấc. Đổi tư thế mỗi BEAT giây
SEQ = [
    [0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0],
    [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0],
]
BEAT = 0.17


# Bàn tay do Nano Banana 2 vẽ lại từ ảnh cận cảnh bàn phím khung 0 của chị (lưng bàn tay có khối, 4
# đốt tay, ngón cái chìa sang trái), cắt sẵn thành scripts/chill-hand-girl.png: 72×50 px ô ×2, cổ tay
# (điểm neo) ở (-OX, -OY). Anh dùng cùng bàn tay, thu còn 0,8 và chỉnh sang màu da của anh.
OX, OY, SW, SH = -58, -34, 72, 50
HAND = os.path.join(ROOT, 'scripts', 'chill-hand-girl.png')
_sprites = {}
_base = {}


def base_hand(n):
    if n in _base:
        return _base[n]
    im = Image.open(HAND).convert('RGBA')
    if n == 'boy':
        s = SCALE['boy']
        w, h = round(SW * s), round(SH * s)
        small = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(float)
        small[..., 3] = np.where(small[..., 3] > 127, 255, 0)
        a = np.zeros((SH, SW, 4))
        # giữ điểm neo (cổ tay) ở nguyên chỗ
        x0, y0 = round(-OX - (-OX) * s), round(-OY - (-OY) * s)
        a[y0:y0 + h, x0:x0 + w] = small
        ratio = np.array(PAL['boy']['base'], float) / np.array(PAL['girl']['base'], float)
        a[..., :3] = np.clip(a[..., :3] * ratio, 0, 255)
    else:
        a = np.asarray(im).astype(float)
    a[a[..., 3] == 0] = 0
    # 4 đốt tay: chia đều bề ngang của dải trên cùng bàn tay
    ys, xs = np.nonzero(a[..., 3])
    top = xs[ys < ys.min() + 9]
    edges = np.linspace(top.min(), top.max() + 1, 5).round().astype(int)
    _base[n] = (a, edges)
    return _base[n]


def sprite(n, pose):
    # Ngón đang nhấc: đốt tay của ngón đó nhô lên 2 px (12 hàng trên cùng của cột dời lên, phần dưới
    # giữ nguyên) — lưng bàn tay đứng yên, chỉ các đốt nhấp nhô theo nhịp gõ
    key = (n, tuple(pose))
    if key in _sprites:
        return _sprites[key]
    a, edges = base_hand(n)
    out = a.copy()
    for k in range(4):
        if not pose[k]:
            continue
        for x in range(edges[k], edges[k + 1]):
            col = np.nonzero(a[:, x, 3])[0]
            if not len(col) or col[0] < 2:
                continue
            t = col[0]
            out[t - 2:t + 10, x] = a[t:t + 12, x]
    _sprites[key] = out
    return out


def pose_at(t):
    return SEQ[int(t / BEAT) % len(SEQ)]

# ---------------------------------------------------------------- phân loại pixel


def skinmask(c):
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    return (R > 170) & (R - B > 40) & (G > 110) & (R > G) & (G > B) & ((R - G) < 110)


def sleevemask(c, n):
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    mx = c.max(-1)
    if n == 'boy':
        return (B - R > 10) & (mx < 140)
    return (B - G > 10) & (R - G > 4) & (mx > 90)


def big_sleeve(c, n, z):
    # Tay áo thật là mảng lớn; vệt tím / nâu mảnh trên phím là viền tay cũ còn sót
    m = np.zeros(c.shape[:2], bool)
    x0, y0, x1, y1 = z
    m[y0:y1, x0:x1] = dil(sleevemask(c[y0:y1, x0:x1], n), 1)
    out = np.zeros_like(m)
    for comp in components(m):
        if len(comp) >= 150:
            ys, xs = zip(*comp)
            out[list(ys), list(xs)] = True
    return out


def tinted(c):
    # phím, khung laptop là xám trung tính; điểm có sắc màu trên mặt phím là viền tay cũ
    return (c.max(-1) - c.min(-1) > 14) & (c.max(-1) < 200)


def brownish(c):
    # viền nâu của tay cũ (phím là xám trung tính)
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    return (R - B > 8) & (R >= G) & (c.max(-1) < 170)


def dil(m, k=1):
    o = m.copy()
    for _ in range(k):
        p = o.copy()
        p[1:] |= o[:-1]
        p[:-1] |= o[1:]
        p[:, 1:] |= o[:, :-1]
        p[:, :-1] |= o[:, 1:]
        o = p
    return o


def components(m):
    h, w = m.shape
    seen = np.zeros_like(m)
    comps = []
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        comps.append(pts)
    return comps


def biggest(m):
    best = max(components(m), key=len, default=[])
    out = np.zeros_like(m)
    if best:
        ys, xs = zip(*best)
        out[list(ys), list(xs)] = True
    return out


def hand_blob(c):
    x0, y0, x1, y1 = Z
    m = np.zeros(c.shape[:2], bool)
    m[y0:y1, x0:x1] = skinmask(c[y0:y1, x0:x1])
    b = biggest(m)
    return b if b.sum() >= 250 else None


def key_area():
    # Mặt bàn phím (sau mép bạc chéo phía trước), trong vùng Z — chỗ được dọn viền nâu
    x0, y0, x1, y1 = Z
    m = np.zeros((CH2, CW2), bool)
    for y in range(y0, y1):
        zy = y - y0
        edge = 20 if zy < 45 else int(round(2 + (zy - 45) * 1.2)) + 3
        m[y, x0 + edge:x1] = y >= SCREEN[3]  # phía trên là lòng màn (code vẽ đè)
    return m

# ---------------------------------------------------------------- ghép như scene.ts


CW2, CH2 = AT[2], AT[3]
BG = np.array([26, 21, 32], float)


def git_image(rev, name):
    data = subprocess.check_output(['git', 'show', '%s:%s/%s' % (rev, SCENES, name)], cwd=ROOT)
    return Image.open(io.BytesIO(data)).convert('RGBA')


def cells(sheet, scale, cols, frames):
    cw, ch = CW2 * scale // 2, CH2 * scale // 2
    a = np.asarray(sheet).astype(float)

    def cell(i):
        c = a[(i // cols) * ch:(i // cols) * ch + ch, (i % cols) * cw:(i % cols) * cw + cw]
        return c if scale == 2 else c.repeat(2, 0).repeat(2, 1)
    return a, cell, cw, ch


def under(interior, mask_cell):
    reg = interior[AT[1]:AT[1] + CH2, AT[0]:AT[0] + CW2].copy()
    reg[..., 3] *= 1 - mask_cell[..., 3] / 255
    return reg


def compose(f, reg):
    a, ra = f[..., 3:4] / 255, reg[..., 3:4] / 255
    return f[..., :3] * a + (reg[..., :3] * ra + BG * (1 - ra)) * (1 - a)

# ---------------------------------------------------------------- bàn phím sạch


def keyboard_plate(g):
    # g: vùng Z lúc chị cầm ly. Mỗi hàng: đoạn sạch ngay sau mép bạc; phần bị che lấy màu giữa
    # của đoạn đó (hàng phím là dải ngang)
    H, W = g.shape[:2]
    bad = brownish(g) | dil(sleevemask(g, 'girl'), 2)
    p = g.copy()
    for y in range(H):
        a = 20 if y < 45 else int(round(2 + (y - 45) * 1.2)) + 3
        seg = []
        for x in range(a, min(a + 30, W)):
            if bad[y, x]:
                if seg:
                    break
                continue
            seg.append(x)
            if len(seg) >= 14:
                break
        if len(seg) < 4:
            p[y, a:] = p[y - 1, a:]
            continue
        vals = g[y, seg[0]:seg[-1] + 1]
        col = np.median(vals[2:] if len(vals) > 6 else vals, 0)
        p[y, seg[-1] + 1:] = col
        p[y, a:seg[0]] = col
    full = np.zeros((CH2, CW2, 3))
    full[Z[1]:Z[3], Z[0]:Z[2]] = p
    return full


def build_plates(rev):
    interior = np.asarray(git_image(rev, SHEETS['girl']['interior'])).astype(float)
    sheet = git_image(rev, 'interior-girl-loop@2x.webp')
    _, cell, _, _ = cells(sheet, 2, 10, 81)
    reg = under(interior, cell(81))
    x0, y0, x1, y1 = Z
    g = np.median([compose(cell(i), reg)[y0:y1, x0:x1] for i in GIRL_SIP_HI], 0)
    girl = keyboard_plate(g)
    # Anh: cùng laptop, bù lệch màu trên phần bàn phím luôn thấy (bên trái tay)
    interior_b = np.asarray(git_image(rev, SHEETS['boy']['interior'])).astype(float)
    sheet_b = git_image(rev, 'interior-loop@2x.webp')
    _, cell_b, _, _ = cells(sheet_b, 2, 10, 81)
    reg_b = under(interior_b, cell_b(81))
    diffs = []
    for i in range(0, 81, 8):
        c = compose(cell_b(i), reg_b)
        vis = ~(dil(skinmask(c), 3) | dil(sleevemask(c, 'boy'), 2) | brownish(c))
        box = np.zeros_like(vis)
        box[y0 + 20:y1 - 10, x0 + 4:x0 + 40] = True
        k = vis & box
        diffs.append((c[k] - girl[k]).mean(0))
    boy = np.clip(girl + np.mean(diffs, 0), 0, 255)
    return {'girl': girl, 'boy': boy}

# ---------------------------------------------------------------- xử lý 1 sheet


# ---------------------------------------------------------------- bàn tay của Bàn đêm
# Bàn đêm (room-desk*) dùng cùng laptop, cùng chỗ (lòng màn 436, 219 px gốc) và video Kling có
# bàn tay gõ phím tự nhiên suốt cả vòng. Chế độ --hand desk lấy bàn tay của khung cùng thời điểm ở
# Bàn đêm (sheet cùng cỡ: hi 81 khung 8 fps, lo 121 khung 12 fps) đặt vào cổ tay của quán, nên
# hai phòng gõ phím bằng cùng một bàn tay, cùng nhịp.
CAFE_AT = (429, 116)
DESK = {
    'girl': dict(interior='room-desk-girl.webp', at=(429, 131, 211, 207),
                 sheets={2: ('room-desk-girl-loop@2x.webp', 10, 81), 1: ('room-desk-girl-loop.webp', 12, 121)}),
    'boy': dict(interior='room-desk.webp', at=(437, 136, 203, 202),
                sheets={2: ('room-desk-loop@2x.webp', 10, 81), 1: ('room-desk-loop.webp', 12, 121)}),
}


def fill_small_holes(m, size):
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = m[y0:y1, x0:x1]
    out = m.copy()
    for comp in components(~sub):
        cy, cx = map(list, zip(*comp))
        edge = min(cy) == 0 or min(cx) == 0 or max(cy) == sub.shape[0] - 1 or max(cx) == sub.shape[1] - 1
        if not edge and len(comp) < size:
            out[[y + y0 for y in cy], [x + x0 for x in cx]] = True
    return out


# Bàn tay lấy từ video Bàn đêm của ai, thu nhỏ bao nhiêu, chỉnh màu da ra sao. Video Bàn đêm của
# anh vẽ bàn tay thành cục ngón đan vào nhau, nên anh mượn bàn tay của chị: thu 0,8 (tay cũ của anh
# lộ ra cỡ đó dưới tay áo) và nhân màu theo da tay cũ của anh / của chị (224,134,93 / 240,171,118)
HAND_SRC = {
    'girl': ('girl', 1.0, None),
    'boy': ('girl', 0.8, (224 / 240, 134 / 171, 93 / 118)),
}


def resize_hand(c, hand, br, s, k):
    # Thu bàn tay quanh góc dưới-phải; k = 2 khi ô là bản lo đã nhân đôi (thu ở độ phân giải gốc
    # rồi nhân đôi lại để giữ khối 2×2)
    ys, xs = np.nonzero(hand)
    y0, x0 = ys.min() // k * k, xs.min() // k * k
    y1, x1 = (ys.max() // k + 1) * k, (xs.max() // k + 1) * k
    sub = c[y0:y1:k, x0:x1:k]
    msk = hand[y0:y1:k, x0:x1:k].astype(float)
    H, W = msk.shape
    h2, w2 = max(1, round(H * s)), max(1, round(W * s))
    rgb = np.stack([np.asarray(Image.fromarray(sub[..., j].astype(np.float32)).resize((w2, h2), Image.LANCZOS))
                    for j in range(3)], -1)
    m2 = np.asarray(Image.fromarray(msk.astype(np.float32)).resize((w2, h2), Image.BILINEAR)) > 0.5
    rgb, m2 = rgb.repeat(k, 0).repeat(k, 1), m2.repeat(k, 0).repeat(k, 1)
    oc = np.zeros_like(c)
    om = np.zeros_like(hand)
    ny0, nx0 = y1 - h2 * k, x1 - w2 * k
    oc[ny0:y1, nx0:x1] = rgb
    om[ny0:y1, nx0:x1] = m2
    bx, by = br
    return oc, om, (x1 - 1 - round((x1 - 1 - bx) * s), y1 - 1 - round((y1 - 1 - by) * s))


def desk_hands(n, scale):
    # Mỗi khung Bàn đêm: (ảnh ghép ×2, mặt nạ bàn tay, góc dưới-phải cục da) theo toạ độ ô Bàn đêm
    src, s, tint = HAND_SRC[n]
    cfg = DESK[src]
    n = src
    name, cols, frames = cfg['sheets'][scale]
    ax, ay, aw, ah = cfg['at']
    w, h = aw * 2, ah * 2
    dx, dy = (ax - CAFE_AT[0]) * 2, (ay - CAFE_AT[1]) * 2
    a = np.asarray(git_image('HEAD', name)).astype(float)
    cw, ch = w * scale // 2, h * scale // 2

    def cell(i):
        c = a[(i // cols) * ch:(i // cols) * ch + ch, (i % cols) * cw:(i % cols) * cw + cw]
        return c if scale == 2 else c.repeat(2, 0).repeat(2, 1)
    interior = np.asarray(git_image('HEAD', cfg['interior'])).astype(float)
    if interior.shape[1] == 640:
        interior = interior.repeat(2, 0).repeat(2, 1)
    reg = interior[ay * 2:ay * 2 + h, ax * 2:ax * 2 + w].copy()
    reg[..., 3] *= 1 - cell(frames)[..., 3] / 255
    x0, y0, x1, y1 = max(0, Z[0] - dx), max(0, Z[1] - dy), Z[2] - dx, Z[3] - dy
    out = []
    for i in range(frames):
        c = compose(cell(i), reg)
        m = np.zeros(c.shape[:2], bool)
        m[y0:y1, x0:x1] = skinmask(c[y0:y1, x0:x1])
        skin = biggest(m)
        if skin.sum() < 250:
            out.append(None)
            continue
        # viền nâu + bóng giữa các ngón dính vào da; tay áo để quán tự đè
        hand = skin | (dil(skin, 3) & brownish(c) & ~sleevemask(c, n))
        hand = fill_small_holes(hand, 30)
        ys, xs = np.nonzero(skin)
        br = (xs.max(), ys.max())
        if s != 1.0:
            c, hand, br = resize_hand(c, hand, br, s, 1 if scale == 2 else 2)
        if tint:
            c = np.clip(c * np.array(tint), 0, 255)
        out.append((c, hand, br))
    # khung không tìm thấy tay (hiếm): mượn khung gần nhất
    for i in range(frames):
        if out[i] is None:
            for k in range(1, frames):
                for j in (i - k, i + k):
                    if 0 <= j < frames and out[j] is not None and out[i] is None:
                        out[i] = out[j]
    return out


HAND_MODE = 'desk'
# Người ngồi dùng bàn tay Bàn đêm (anh mượn tay chị, HAND_SRC; Bàn đêm của anh sửa theo, xem
# process_desk_sheet). Bỏ khỏi đây thì người đó quay về tay Nano Banana
DESK_SEATS = {'girl', 'boy'}


def process_sheet(n, name, scale, cols, frames, fps, rev, plate, keys, out_dir=None):
    desk = desk_hands(n, scale) if HAND_MODE == 'desk' and n in DESK_SEATS else None
    sheet = git_image(rev, name)
    interior = np.asarray(git_image(rev, SHEETS[n]['interior'])).astype(float)
    arr, cell, cw, ch = cells(sheet, scale, cols, frames)
    reg = under(interior, cell(frames))
    comps, blobs = [], []
    for i in range(frames):
        c = compose(cell(i), reg)
        comps.append(c)
        blobs.append(hand_blob(c))
    # tay đang trên bàn phím mới vẽ lại
    raw = []
    for b in blobs:
        if b is None:
            raw.append(None)
            continue
        ys, xs = np.nonzero(b)
        if n == 'girl' and ys.mean() < 318:  # chị đưa tay này lên cầm ly (anh cầm ly bằng tay kia)
            raw.append(None)
            continue
        # cổ tay mới đặt sao cho góc dưới-phải của tay mới trùng góc dưới-phải cục da cũ
        # (mu tay lấp hết chỗ tay cũ, phần thừa nằm dưới tay áo)
        raw.append((xs.max() - 6 * SCALE[n], ys.max() - 8 * SCALE[n]))
    anchors = []
    for i, a in enumerate(raw):
        if a is None:
            anchors.append(None)
            continue
        near = [raw[j] for j in (i - 1, i, i + 1) if 0 <= j < frames and raw[j] is not None]
        anchors.append((np.median([p[0] for p in near]), np.median([p[1] for p in near])))

    sx0, sy0, sx1, sy1 = SCREEN
    out = arr.copy()
    for i in range(frames):
        c = comps[i]
        new = c.copy()
        changed = np.zeros(c.shape[:2], bool)
        sl = sleevemask(c, n)
        sleeve = big_sleeve(c, n, (Z[0] - 10, Z[1] - 30, Z[2], Z[3] + 30))
        arm = dil(sleeve, 2)
        cuff = dil(sleeve, 1) | sl  # tay áo (cả viền tối) đè lên tay mới
        # dọn viền nâu / cục da sót trên mặt phím. Khung cầm ly: tay đang giơ giữ nguyên, chỉ dọn
        # viền nâu không dính vào da
        if anchors[i] is not None:
            ghost = keys & ~arm & (tinted(c) | skinmask(c))
            ghost |= dil(blobs[i], 4) & ~arm
            # vệt sáng gần trắng của tay cũ (đầu ngón cái) trên mặt phím: không phải da, không có
            # sắc màu nên 2 dòng trên bỏ sót; phím thật thì gần màu bàn phím sạch
            # (cả viền tối quanh vệt, cách bàn phím sạch > 40)
            bright = c.min(-1) > 175
            ghost |= keys & ~arm & dil(c.min(-1) > 130, 1) & (np.abs(c - plate).max(-1) > 40)
            # đốt tay cũ thò lên lòng màn sát mép vai (dính vào tay áo nên lớp `arm` giữ lại): bỏ
            # điểm màu da / nâu / sáng gần cục tay cũ, trừ chính màu tay áo
            scr_old = np.zeros_like(ghost)
            scr_old[sy0:sy1, sx0:sx1] = True
            ghost |= scr_old & dil(blobs[i], 8) & (skinmask(c) | brownish(c) | bright) & ~sl
        else:
            # khung cầm ly: tay rời phím — cả mặt phím (trừ tay áo, tay đang giơ) lấy bàn phím sạch,
            # vốn là trung vị của chính các khung này nên chỉ khác ở viền tay cũ
            ghost = keys & ~arm & ~dil(skinmask(c), 3)
        zone = np.zeros_like(ghost)
        zone[Z[1]:Z[3], Z[0]:Z[2]] = True
        ghost &= zone
        new[ghost] = plate[ghost]
        changed |= ghost
        transparent = np.zeros_like(changed)
        transparent[sy0:sy1, sx0:sx1] = ghost[sy0:sy1, sx0:sx1]
        if anchors[i] is not None and desk is not None:
            # góc dưới-phải cục da Bàn đêm trùng góc dưới-phải cục da cũ của quán (đã làm mượt);
            # ô lo dời chẵn để khối 2×2 của Bàn đêm giữ nguyên khi gộp lại
            dc, hm, (bx, by) = desk[i]
            ox = anchors[i][0] + 6 * SCALE[n] - bx
            oy = anchors[i][1] + 8 * SCALE[n] - by
            ox, oy = (int(round(ox / 2)) * 2, int(round(oy / 2)) * 2) if scale == 1 else (int(round(ox)), int(round(oy)))
            for yy, xx in zip(*np.nonzero(hm)):
                Y, X = yy + oy, xx + ox
                if 0 <= Y < CH2 and 0 <= X < CW2 and not cuff[Y, X]:
                    new[Y, X] = dc[yy, xx]
                    changed[Y, X] = True
                    transparent[Y, X] = False
        elif anchors[i] is not None:
            sp = sprite(n, pose_at(i / fps))
            ax, ay = int(round(anchors[i][0])), int(round(anchors[i][1]))
            for yy, xx in zip(*np.nonzero(sp[..., 3])):
                Y, X = ay + OY + yy, ax + OX + xx
                if 0 <= Y < CH2 and 0 <= X < CW2 and not cuff[Y, X]:
                    new[Y, X] = sp[yy, xx, :3]
                    changed[Y, X] = True
                    transparent[Y, X] = False
        orig = cell(i)
        # Mẩu lẻ còn đục trong lòng màn sát chỗ vừa khoét (điểm sáng / xám của tay cũ không bị coi
        # là da hay viền nâu): làm trong suốt luôn, kẻo thành chấm lấm tấm trên màn code vẽ
        opaque = ((orig[..., 3] > 0) & ~changed) | (changed & ~transparent)
        scr = np.zeros_like(opaque)
        scr[sy0:sy1, sx0:sx1] = opaque[sy0:sy1, sx0:sx1]
        near = dil(changed, 2)
        for comp in components(scr):
            ys, xs = map(list, zip(*comp))
            if len(comp) < 60 and near[ys, xs].any():
                changed[ys, xs] = True
                transparent[ys, xs] = True
        # ghi lại vào ô sheet (ô lo: gộp 2×2). Điểm không đổi giữ nguyên màu + alpha gốc (lòng màn
        # vốn trong suốt), không phải đục 255
        r0, c0 = (i // cols) * ch, (i % cols) * cw
        rgba = np.concatenate([new, np.full(new.shape[:2] + (1,), 255.0)], -1)
        rgba[~changed] = orig[~changed]
        rgba[transparent] = 0
        if scale == 1:
            ch_ = changed.reshape(ch, 2, cw, 2).any((1, 3))
            # gộp 2×2 chỉ lấy màu các điểm đục (điểm trong suốt không kéo màu về đen); ô đục khi
            # ít nhất 2/4 điểm đục, như sheet gốc chỉ có alpha 0 / 255
            blk = rgba.reshape(ch, 2, cw, 2, 4)
            op = blk[..., 3] > 0
            cnt = op.sum((1, 3))
            rgb = (blk[..., :3] * op[..., None]).sum((1, 3)) / np.maximum(cnt, 1)[..., None]
            small = np.concatenate([rgb, np.full(cnt.shape + (1,), 255.0)], -1)
            small[cnt < 2] = 0
            tile = out[r0:r0 + ch, c0:c0 + cw]
            tile[ch_] = small[ch_]
        else:
            tile = out[r0:r0 + ch, c0:c0 + cw]
            tile[changed] = rgba[changed]
    path = os.path.join(out_dir or os.path.join(ROOT, SCENES), name)
    # cùng chất lượng với lúc tạo sheet: thường 88 (chill-girl-cafe-art.py), Noel 92 (chill-noel-art.py)
    q = 92 if 'noel' in name else 88
    Image.fromarray(out.round().astype(np.uint8)).save(path, 'WEBP', quality=q, alpha_quality=100, method=6, exact=True)
    print(path, os.path.getsize(path), 'hands', sum(a is not None for a in anchors), '/', frames)


# ---------------------------------------------------------------- Bàn đêm của anh
# Video Bàn đêm của anh vẽ bàn tay thành cục ngón đan vào nhau, nên Bàn đêm của anh cũng thay bằng
# bàn tay của chị ở Bàn đêm (cùng phòng, cùng laptop) như ở quán: thu 0,8, màu da anh, khung cùng
# thời điểm. Laptop ở Bàn đêm vẽ khác quán (lệch ~10 px, màn to hơn) nên có bàn phím sạch riêng:
# mỗi điểm lấy trung vị các khung tay cũ không che điểm đó, điểm luôn bị che lấy màu giữa của hàng.
# Ô Bàn đêm chỉ đục ở phần chuyển động (tay, đầu); lòng màn vẽ dưới ảnh tĩnh nên trong khung là
# trong suốt. Đọc sheet gốc ở DESK_REV (trước khi sửa tay Bàn đêm) nên chạy lại không vẽ chồng.
DESK_REV = '38003aa'
DESK_BOY = dict(at=(437, 136, 203, 202), interior='room-desk.webp', sheets=[
    ('room-desk-loop@2x.webp', 2, 10, 81, 8),
    ('room-desk-loop.webp', 1, 12, 121, 12),
    ('room-desk-loop-noel@2x.webp', 2, 10, 81, 8),
    ('room-desk-loop-noel.webp', 1, 12, 121, 12),
])
# Vùng bàn tay (ô ×2 của Bàn đêm anh) và lòng màn (436, 219, 99×51 px gốc → trong ô)
ZD = (0, 236, 190, 330)
SCREEN_D = (0, 166, 196, 268)


class DeskRoom:
    def __init__(self, name, scale, cols, frames):
        ax, ay, aw, ah = DESK_BOY['at']
        self.w, self.h = aw * 2, ah * 2
        self.scale, self.cols, self.frames = scale, cols, frames
        self.cw, self.ch = self.w * scale // 2, self.h * scale // 2
        self.arr = np.asarray(git_image(DESK_REV, name)).astype(float)
        interior = np.asarray(git_image(DESK_REV, DESK_BOY['interior'])).astype(float)
        if interior.shape[1] == 640:
            interior = interior.repeat(2, 0).repeat(2, 1)
        self.reg = interior[ay * 2:ay * 2 + self.h, ax * 2:ax * 2 + self.w].copy()
        self.reg[..., 3] *= 1 - self.cell(frames)[..., 3] / 255

    def cell(self, i):
        r0, c0 = (i // self.cols) * self.ch, (i % self.cols) * self.cw
        c = self.arr[r0:r0 + self.ch, c0:c0 + self.cw]
        return c if self.scale == 2 else c.repeat(2, 0).repeat(2, 1)

    def comp(self, i):
        f = self.cell(i)
        a, ra = f[..., 3:4] / 255, self.reg[..., 3:4] / 255
        return f[..., :3] * a + (self.reg[..., :3] * ra + BG * (1 - ra)) * (1 - a)


def desk_blob(c):
    x0, y0, x1, y1 = ZD
    m = np.zeros(c.shape[:2], bool)
    m[y0:y1, x0:x1] = skinmask(c[y0:y1, x0:x1])
    b = biggest(m)
    return b if b.sum() >= 250 else None


def desk_plate():
    # Bàn phím sạch của Bàn đêm từ sheet hi thường
    room = DeskRoom(DESK_BOY['sheets'][0][0], 2, 10, 81)
    x0, y0, x1, y1 = ZD
    obs, ok = [], []
    for i in range(room.frames):
        c = room.comp(i)
        b = desk_blob(c)
        cover = dil(sleevemask(c, 'boy'), 3) | dil(skinmask(c), 3) | brownish(c)
        if b is not None:
            cover |= dil(b, 5)
        obs.append(c[y0:y1, x0:x1])
        ok.append(~cover[y0:y1, x0:x1])
    obs, ok = np.array(obs), np.array(ok)
    cnt = ok.sum(0)
    plate = np.zeros(obs.shape[1:])
    for y in range(obs.shape[1]):
        for x in range(obs.shape[2]):
            if cnt[y, x] >= 3:
                plate[y, x] = np.median(obs[ok[:, y, x], y, x], 0)
    # điểm luôn bị che: màu giữa của các điểm có trong cùng hàng, lấy đoạn gần nhất bên trái
    for y in range(obs.shape[1]):
        good = np.nonzero(cnt[y] >= 3)[0]
        for x in np.nonzero(cnt[y] < 3)[0]:
            left = good[good < x]
            src = left[-8:] if len(left) else good[:8]
            plate[y, x] = np.median(plate[y, src], 0) if len(src) else plate[y - 1, x]
    full = np.zeros((room.h, room.w, 3))
    full[y0:y1, x0:x1] = plate
    return full


def process_desk_sheet(name, scale, cols, frames, fps, plate, out_dir=None):
    room = DeskRoom(name, scale, cols, frames)
    hands = desk_hands('boy', scale)
    comps, blobs = [], []
    for i in range(frames):
        c = room.comp(i)
        comps.append(c)
        blobs.append(desk_blob(c))
    raw = [None if b is None else (np.nonzero(b)[1].max(), np.nonzero(b)[0].max()) for b in blobs]
    anchors = []
    for i, a in enumerate(raw):
        near = [raw[j] for j in (i - 1, i, i + 1) if 0 <= j < frames and raw[j] is not None]
        anchors.append((np.median([p[0] for p in near]), np.median([p[1] for p in near])) if near else None)
    sx0, sy0, sx1, sy1 = SCREEN_D
    out = room.arr.copy()
    H, W = room.h, room.w
    zone = np.zeros((H, W), bool)
    zone[ZD[1]:ZD[3], ZD[0]:ZD[2]] = True
    for i in range(frames):
        c = comps[i]
        new = c.copy()
        sl = sleevemask(c, 'boy')
        sleeve = big_sleeve(c, 'boy', (ZD[0], ZD[1] - 30, ZD[2], ZD[3]))
        arm = dil(sleeve, 2)
        cuff = dil(sleeve, 1) | sl
        ghost = np.zeros((H, W), bool)
        if blobs[i] is not None:
            # cục tay cũ + viền nâu + điểm sáng hồng trên mu tay quanh nó
            near_old = dil(blobs[i], 5) & ~arm
            ghost = near_old & (skinmask(c) | brownish(c) | tinted(c) | (c.min(-1) > 130)
                                | (np.abs(c - plate).max(-1) > 40))
            ghost |= dil(blobs[i], 2) & ~arm
        # đốt tay cũ tách rời cục chính (nhô lên mép phím / viền màn): mọi mảng da trong vùng tay
        skin_any = dil(skinmask(c), 3) & ~arm
        ghost |= skin_any & (skinmask(c) | brownish(c) | (c.min(-1) > 130) | (np.abs(c - plate).max(-1) > 40))
        ghost &= zone
        new[ghost] = plate[ghost]
        changed = ghost.copy()
        transparent = np.zeros_like(changed)
        transparent[sy0:sy1, sx0:sx1] = ghost[sy0:sy1, sx0:sx1]
        if anchors[i] is not None:
            dc, hm, (bx, by) = hands[i]
            ox, oy = anchors[i][0] - bx, anchors[i][1] - by
            ox, oy = (int(round(ox / 2)) * 2, int(round(oy / 2)) * 2) if scale == 1 else (int(round(ox)), int(round(oy)))
            for yy, xx in zip(*np.nonzero(hm)):
                Y, X = yy + oy, xx + ox
                if 0 <= Y < H and 0 <= X < W and not cuff[Y, X]:
                    new[Y, X] = dc[yy, xx]
                    changed[Y, X] = True
                    transparent[Y, X] = False
        orig = room.cell(i)
        opaque = ((orig[..., 3] > 0) & ~changed) | (changed & ~transparent)
        scr = np.zeros_like(opaque)
        scr[sy0:sy1, sx0:sx1] = opaque[sy0:sy1, sx0:sx1]
        near = dil(changed, 2)
        for comp in components(scr):
            ys, xs = map(list, zip(*comp))
            if len(comp) < 60 and near[ys, xs].any():
                changed[ys, xs] = True
                transparent[ys, xs] = True
        rgba = np.concatenate([new, np.full(new.shape[:2] + (1,), 255.0)], -1)
        rgba[~changed] = orig[~changed]
        rgba[transparent] = 0
        r0, c0 = (i // cols) * room.ch, (i % cols) * room.cw
        tile = out[r0:r0 + room.ch, c0:c0 + room.cw]
        if scale == 1:
            ch_ = changed.reshape(room.ch, 2, room.cw, 2).any((1, 3))
            blk = rgba.reshape(room.ch, 2, room.cw, 2, 4)
            op = blk[..., 3] > 0
            cnt = op.sum((1, 3))
            rgb = (blk[..., :3] * op[..., None]).sum((1, 3)) / np.maximum(cnt, 1)[..., None]
            small = np.concatenate([rgb, np.full(cnt.shape + (1,), 255.0)], -1)
            small[cnt < 2] = 0
            tile[ch_] = small[ch_]
        else:
            tile[changed] = rgba[changed]
    path = os.path.join(out_dir or os.path.join(ROOT, SCENES), name)
    q = 92 if 'noel' in name else 88
    Image.fromarray(out.round().astype(np.uint8)).save(path, 'WEBP', quality=q, alpha_quality=100, method=6, exact=True)
    print(path, os.path.getsize(path), 'hands', sum(a is not None for a in anchors), '/', frames)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rev', default='5dcf719')
    ap.add_argument('--only', choices=['boy', 'girl'])
    ap.add_argument('--hand', choices=['desk', 'nano'], default='desk')
    ap.add_argument('--sheet', help='chỉ làm 1 sheet (tên file)')
    ap.add_argument('--room', choices=['cafe', 'desk', 'all'], default='all', help='desk = Bàn đêm của anh')
    ap.add_argument('--out', help='ghi sheet vào thư mục này thay vì public/chill/scenes')
    args = ap.parse_args()
    global HAND_MODE
    HAND_MODE = args.hand
    plates = build_plates(args.rev)
    keys = key_area()
    if args.room in ('cafe', 'all'):
        for n, cfg in SHEETS.items():
            if args.only and n != args.only:
                continue
            for name, scale, cols, frames, fps in cfg['sheets']:
                if args.sheet and name != args.sheet:
                    continue
                process_sheet(n, name, scale, cols, frames, fps, args.rev, plates[n], keys, args.out)
    if args.room in ('desk', 'all') and args.only != 'girl' and args.hand == 'desk' and 'boy' in DESK_SEATS:
        dplate = desk_plate()
        for name, scale, cols, frames, fps in DESK_BOY['sheets']:
            if args.sheet and name != args.sheet:
                continue
            process_desk_sheet(name, scale, cols, frames, fps, dplate, args.out)


if __name__ == '__main__':
    main()
