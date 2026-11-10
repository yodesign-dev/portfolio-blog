#!/usr/bin/env python3
# Vẽ lại bàn tay gõ phím của người ngồi phòng Café window (/chill), cả anh lẫn chị.
#
# Video Kling vẽ bàn tay trên bàn phím thành một cục nhoè, không thấy ngón. Script này, trên
# từng khung của 8 sheet (anh / chị × thường / Noel × hi ×2 / lo ×1):
#   1. tìm cục da tay trên bàn phím (khung đang ghép đúng như scene.ts vẽ: nội thất đã khoét
#      mặt nạ + khung người), xoá nó cùng viền nâu, vá lại bằng bàn phím sạch;
#   2. đặt bàn tay mới (Nano Banana 2 vẽ, scripts/chill-hand-girl.png) bám theo cổ tay
#      của khung đó; tay áo trong khung vẫn đè lên cổ tay;
#   3. đốt tay nhấp nhô theo nhịp gõ tính bằng giây, nên sheet 8 fps và 12 fps gõ giống nhau.
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
        if anchors[i] is not None:
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
