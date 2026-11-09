#!/usr/bin/env python3
# Vẽ lại bàn tay gõ phím của người ngồi phòng Café window (/chill), cả anh lẫn chị.
#
# Video Kling vẽ bàn tay trên bàn phím thành một cục nhoè, không thấy ngón. Script này, trên
# từng khung của 8 sheet (anh / chị × thường / Noel × hi ×2 / lo ×1):
#   1. tìm cục da tay trên bàn phím (khung đang ghép đúng như scene.ts vẽ: nội thất đã khoét
#      mặt nạ + khung người), xoá nó cùng viền nâu, vá lại bằng bàn phím sạch;
#   2. vẽ bàn tay pixel mới (4 ngón khép, co xuống phím, đốt tay, ngón cái dưới) bám theo cổ tay
#      của khung đó; tay áo trong khung vẫn đè lên cổ tay;
#   3. ngón tay nhấc / đặt theo nhịp gõ tính bằng giây, nên sheet 8 fps và 12 fps gõ giống nhau.
# Khung chị đưa tay lên cầm ly thì để nguyên tay, chỉ dọn viền nâu "bóng ma" còn trên bàn phím.
#
# Bàn phím sạch lấy từ các khung chị cầm ly (tay rời bàn phím); anh và chị cùng một laptop, bản
# anh chỉ bù lệch màu. Phần bàn phím bị che ở mọi khung: mỗi hàng phím lấy màu giữa của đoạn còn
# thấy ngay sau mép bạc.
#
#   python3 scripts/chill-hands-art.py [--rev 5dcf719] [--preview <thư mục>]
#
# Luôn đọc sheet gốc từ git (--rev, mặc định 5dcf719 = trước khi vẽ lại tay) nên chạy lại không
# vẽ chồng. Ghi đè public/chill/scenes/*.webp. Cần numpy, Pillow.

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


def hand_parts(n, pose):
    # Bàn tay trái đặt trên phím, nhìn từ sau vai — theo tỉ lệ tay trong video gốc: gờ 4 đốt tay
    # dọc mép trên, 4 ngón khép chạy chéo xuống trái, đầu ngón chạm phím ngang tầm cổ tay; mu tay
    # ở bên phải, khuất dần vào tay áo. Gốc (0, 0) = cổ tay ở mép áo, px ô ×2 (cỡ tay chị).
    s = SCALE[n]
    parts = [('poly', [(-45, -15), (-40, -22), (-28, -23.5), (-18, -22), (-8, -17), (0, -10), (6, 0),
                       (7, 9), (-8, 11), (-22, 9), (-33, 3)], None, 'palm'),
             # ngón cái nằm dọc phím cách, dưới các ngón
             ('cap', [(-10, 6), (-22, 7.5), (-27, 6)], 3.2, 'thumb')]
    # đốt tay từ trái sang phải
    fingers = [((-43, -18.5), 3.6), ((-36, -20.5), 3.8), ((-29, -20.5), 3.6), ((-22.5, -18.5), 3.3)]
    for k, (K, r) in enumerate(fingers):
        lift = pose[k]
        ln = 1.0 - 0.1 * k
        # đốt gần chĩa xuống trái, đốt xa gập xuống phím; ngón nhấc co lên về phía đốt
        J = (K[0] - 4 * ln + 1.0 * lift, K[1] + 9 * ln - 2.0 * lift)
        T = (J[0] - 3 * ln + 1.5 * lift, J[1] + 8 * ln - 3.5 * lift)
        parts.append(('cap', [K, J, T], r, 'f%d' % k))
    return [(t, [(x * s, y * s) for x, y in pts], (r * s if r else None), nm) for t, pts, r, nm in parts]


def inside(part, X, Y):
    t, pts, r, _ = part
    if t == 'cap':
        m = np.zeros_like(X, bool)
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            dx, dy = x1 - x0, y1 - y0
            tt = np.clip(((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
            m |= (X - x0 - tt * dx) ** 2 + (Y - y0 - tt * dy) ** 2 <= r * r
        return m
    c = np.zeros_like(X, bool)
    for i in range(len(pts)):
        xa, ya = pts[i]
        xb, yb = pts[(i + 1) % len(pts)]
        c ^= ((ya > Y) != (yb > Y)) & (X < (xb - xa) * (Y - ya) / (yb - ya + 1e-9) + xa)
    return c


OX, OY, SW, SH = -58, -32, 66, 44
_sprites = {}


def sprite(n, pose):
    key = (n, tuple(pose))
    if key in _sprites:
        return _sprites[key]
    parts = hand_parts(n, pose)
    ys, xs = np.mgrid[0:SH, 0:SW]
    X, Y = xs + OX + 0.5, ys + OY + 0.5
    # ngón cái dưới cùng, rồi các ngón (xa → gần), mu tay đè lên gốc ngón
    order = [p for p in parts if p[3] == 'palm'] + [p for p in parts if p[3] == 'thumb'] + \
        [p for p in parts if p[3].startswith('f')]
    names = [p[3] for p in order]
    lab = np.full((SH, SW), -1)
    for k, p in enumerate(order):
        lab[inside(p, X, Y)] = k
    pad = np.pad(lab, 2, constant_values=-1)

    def nb(dx, dy):
        return pad[2 + dy:2 + dy + SH, 2 + dx:2 + dx + SW]

    up, dn, lf, rt, ul, dr = nb(0, -1), nb(0, 1), nb(-1, 0), nb(1, 0), nb(-1, -1), nb(1, 1)
    pal = PAL[n]
    s = SCALE[n]
    out = np.zeros((SH, SW, 4))
    for y in range(SH):
        for x in range(SW):
            L = lab[y, x]
            if L < 0:
                continue
            nm = names[L]
            around = (up[y, x], dn[y, x], lf[y, x], rt[y, x])
            if min(around) < 0:
                col = pal['ol']  # viền ngoài
            elif nm.startswith('f') and any(0 <= v < L and names[v].startswith('f') for v in around) \
                    and Y[y, x] > -17 * s:
                col = pal['ol']  # khe giữa 2 ngón (dưới gờ đốt)
            elif ul[y, x] != L:
                col = pal['li']
            elif dr[y, x] != L or dn[y, x] != L:
                col = pal['sh']
            elif nm.startswith('f') and up[y, x] >= 0 and nb(0, -2)[y, x] < 0:
                col = pal['hi']  # đỉnh đốt tay bắt sáng cửa sổ
            elif nm == 'palm' and (X[y, x] > 0 or Y[y, x] > 3 * s):
                col = pal['sh']  # phía cổ tay / mép dưới khuất bóng
            else:
                col = pal['base']
            out[y, x, :3] = col
            out[y, x, 3] = 255
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


def process_sheet(n, name, scale, cols, frames, fps, rev, plate, keys):
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
        if anchors[i] is not None:
            sp = sprite(n, pose_at(i / fps))
            ax, ay = int(round(anchors[i][0])), int(round(anchors[i][1]))
            for yy, xx in zip(*np.nonzero(sp[..., 3])):
                Y, X = ay + OY + yy, ax + OX + xx
                if 0 <= Y < CH2 and 0 <= X < CW2 and not cuff[Y, X]:
                    new[Y, X] = sp[yy, xx, :3]
                    changed[Y, X] = True
                    transparent[Y, X] = False
        # ghi lại vào ô sheet (ô lo: gộp 2×2)
        r0, c0 = (i // cols) * ch, (i % cols) * cw
        rgba = np.concatenate([new, np.full(new.shape[:2] + (1,), 255.0)], -1)
        rgba[transparent] = 0
        if scale == 1:
            ch_ = changed.reshape(ch, 2, cw, 2).any((1, 3))
            tr = transparent.reshape(ch, 2, cw, 2).all((1, 3))
            small = rgba.reshape(ch, 2, cw, 2, 4).mean((1, 3))
            small[tr] = 0
            tile = out[r0:r0 + ch, c0:c0 + cw]
            tile[ch_] = small[ch_]
        else:
            tile = out[r0:r0 + ch, c0:c0 + cw]
            tile[changed] = rgba[changed]
    path = os.path.join(ROOT, SCENES, name)
    # cùng chất lượng với lúc tạo sheet: thường 88 (chill-girl-cafe-art.py), Noel 92 (chill-noel-art.py)
    q = 92 if 'noel' in name else 88
    Image.fromarray(out.round().astype(np.uint8)).save(path, 'WEBP', quality=q, alpha_quality=100, method=6, exact=True)
    print(path, os.path.getsize(path), 'hands', sum(a is not None for a in anchors), '/', frames)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rev', default='5dcf719')
    ap.add_argument('--only', choices=['boy', 'girl'])
    args = ap.parse_args()
    plates = build_plates(args.rev)
    keys = key_area()
    for n, cfg in SHEETS.items():
        if args.only and n != args.only:
            continue
        for name, scale, cols, frames, fps in cfg['sheets']:
            process_sheet(n, name, scale, cols, frames, fps, args.rev, plates[n], keys)


if __name__ == '__main__':
    main()
