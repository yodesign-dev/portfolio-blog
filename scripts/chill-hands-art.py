#!/usr/bin/env python3
# Vẽ lại bàn tay gõ phím của người ngồi ở Café window và Night desk (/chill), cả anh lẫn chị:
# một bàn tay cho cả hai phòng, tay anh to hơn tay chị.
#
# Video Kling vẽ bàn tay trên bàn phím không ra hình: ở quán là một cục nhoè không thấy ngón, ở
# Bàn đêm tay chị to thô, tay anh thành cục ngón đan vào nhau. Script này, trên từng khung của 16
# sheet (quán / Bàn đêm × anh / chị × thường / Noel × hi ×2 / lo ×1):
#   1. tìm cục da tay trên bàn phím (khung đang ghép đúng như scene.ts vẽ: nội thất đã khoét
#      mặt nạ + khung người), xoá nó cùng viền nâu, vá lại bằng bàn phím sạch;
#   2. đặt bàn tay Nano Banana 2 vẽ (scripts/chill-hand-master.png) bám theo cổ tay của khung đó;
#      tay áo trong khung vẫn đè lên cổ tay. Chị dùng cỡ gốc, anh phóng 1,15 và chỉnh sang màu da
#      anh (SCALE, PAL);
#   3. đốt tay nhấp nhô theo nhịp gõ tính bằng giây, nên sheet 8 fps và 12 fps gõ giống nhau.
# Khung chị đưa tay lên cầm ly ở quán thì để nguyên tay, chỉ dọn viền nâu "bóng ma" trên bàn phím.
#
# Đã thử và bỏ (2026-11-10): ghép bàn tay của video Bàn đêm sang quán theo từng khung. Tay chị
# trông to thô như tay con trai, tay anh (mượn tay chị thu 0,8) nhỏ như tay con gái.
#
# Bàn phím sạch ở quán lấy từ các khung chị cầm ly (tay rời bàn phím); anh và chị cùng một laptop,
# bản anh chỉ bù lệch màu. Phần bàn phím bị che ở mọi khung: mỗi hàng phím lấy màu giữa của đoạn
# còn thấy ngay sau mép bạc. Bàn đêm có bàn phím sạch riêng, xem phần "Bàn đêm" bên dưới.
#
#   python3 scripts/chill-hands-art.py [--rev 5dcf719] [--only boy|girl] [--room cafe|desk]
#                                      [--sheet <tên sheet>] [--boy-scale 1.15] [--out <thư mục>]
#
# Luôn đọc sheet gốc từ git (quán: --rev, mặc định 5dcf719; Bàn đêm: DESK_REV — đều là trước khi
# vẽ lại tay) nên chạy lại không vẽ chồng. Ghi đè public/chill/scenes/*.webp (hoặc --out).
# Cần numpy, Pillow.

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
# Góc trái trên của tay vịn ghế trong ô ×2 (gỗ bắt đầu ở x 184, y 340, chừa viền tối)
CHAIR = (178, 334)

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
# Cỡ bàn tay so với ảnh gốc: tay anh to hơn tay chị (bàn tay đàn ông), cùng một hình vẽ
SCALE = {'boy': 1.15, 'girl': 1.0}
# Lề quanh ô bàn tay để bản phóng to không bị cắt
PAD = 24
# Nhịp gõ: [trỏ, giữa, áp út, út] — 1 = ngón nhấc lên ở nhịp đó. Mỗi nhịp dài BEAT giây
SEQ = [
    [0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0],
    [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0],
]
BEAT = 0.17


# Bàn tay do Nano Banana 2 vẽ lại từ ảnh cận cảnh bàn phím khung 0 của chị (lưng bàn tay có khối, 4
# đốt tay, ngón cái chìa sang trái). scripts/chill-hand-master.png là bàn tay cắt khỏi ảnh gốc
# 1264×848 đó (đã lấp lỗ giữa ngón cái và ngón trỏ), còn nguyên độ phân giải: 1 px của ô ×2 ở cỡ
# tay chị ≈ 6,2 px ảnh gốc. Mỗi người thu thẳng từ ảnh gốc về đúng cỡ của mình (không phóng to một
# hình nhỏ) nên viền nâu liền nét ở mọi cỡ. Anh chỉnh thêm sang màu da của anh.
HAND = os.path.join(ROOT, 'scripts', 'chill-hand-master.png')
F0 = 57 / 352          # ảnh gốc → px ô ×2, cỡ tay chị
ANCHOR_M = (302, 185)  # cổ tay (điểm neo) trong ảnh gốc
# Đỉnh 4 đốt tay trong ảnh gốc: trỏ, giữa, áp út, út
KNUCKLES_M = [(117, 46), (179, 19), (265, 19), (340, 105)]
# Ô bàn tay: cổ tay ở (-OX, -OY), thêm lề PAD mỗi phía
OX, OY, SW, SH = -58, -34, 72, 50
_sprites = {}
_base = {}


def base_hand(n):
    if n in _base:
        return _base[n]
    m = np.asarray(Image.open(HAND).convert('RGBA')).astype(float)
    f = F0 * SCALE[n]
    w, h = round(m.shape[1] * f), round(m.shape[0] * f)
    # thu theo màu đã nhân alpha để mép không ngả đen
    al = m[..., 3:4] / 255
    pm = np.dstack([m[..., :3] * al, al])
    ch = [np.asarray(Image.fromarray(pm[..., j].astype(np.float32)).resize((w, h), Image.LANCZOS)) for j in range(4)]
    cov = np.clip(ch[3], 0, 1)
    img = np.dstack([np.clip(ch[j] / np.maximum(cov, 1e-3), 0, 255) for j in range(3)] + [(cov > 0.5) * 255.0])
    a = np.zeros((SH + 2 * PAD, SW + 2 * PAD, 4))
    x0, y0 = round(PAD - OX - ANCHOR_M[0] * f), round(PAD - OY - ANCHOR_M[1] * f)
    a[y0:y0 + h, x0:x0 + w] = img
    if n == 'boy':
        ratio = np.array(PAL['boy']['base'], float) / np.array(PAL['girl']['base'], float)
        a[..., :3] = np.clip(a[..., :3] * ratio, 0, 255)
    a[a[..., 3] == 0] = 0
    _base[n] = (a, [(x0 + kx * f, y0 + ky * f) for kx, ky in KNUCKLES_M])
    return _base[n]


def sprite(n, amps):
    # Ngón nhấc: đốt tay của ngón đó nhô lên `amps[k]` px (cỡ tay chị). Kéo giãn mềm thay vì dời
    # nguyên khối cột: độ dời giảm dần theo hình chuông sang hai bên đốt tay và giảm về 0 xuống
    # lưng bàn tay, nên mép đốt không bị xé thành gai, lưng bàn tay đứng yên
    key = (n, tuple(amps))
    if key in _sprites:
        return _sprites[key]
    a, knuckles = base_hand(n)
    s = SCALE[n]
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.zeros((H, W))
    for (cx, cy), amp in zip(knuckles, amps):
        if amp <= 0:
            continue
        wx = 0.5 * (1 + np.cos(np.pi * np.clip((xx - cx) / (9 * s), -1, 1)))
        wy = np.clip(1 - (yy - (cy + 5 * s)) / (12 * s), 0, 1)
        d = np.maximum(d, amp * s * wx * wy)
    out = a[np.clip(yy + np.round(d).astype(int), 0, H - 1), xx]
    _sprites[key] = out
    return out


def amps_at(t):
    # Độ nhô của 4 đốt tay ở giây t: mỗi lần nhấc lên rồi hạ xuống theo hình tam giác quanh giữa
    # nhịp (0 → 2 px → 0), nên giữa hai khung có bước 1 px thay vì bật thẳng 2 px
    b = t / BEAT
    amps = [0.0] * 4
    for j in (int(b) - 1, int(b), int(b) + 1):
        w = max(0.0, 1 - abs(b - (j + 0.5)))
        for k, on in enumerate(SEQ[j % len(SEQ)]):
            if on:
                amps[k] = max(amps[k], 2 * w)
    return tuple(round(v * 4) / 4 for v in amps)

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


def sleeve_masks(c, n, zone, blob=None):
    # (màu áo, mảng tay áo, vùng tay áo được giữ nguyên, vùng tay áo đè lên tay mới) quanh bàn tay
    sl = sleevemask(c, n)
    sleeve = big_sleeve(c, n, zone)
    if blob is not None:
        # Tay áo nằm bên phải và phía dưới bàn tay. Phía trên bàn tay, bên trái cổ tay là viền màn
        # laptop: ở Bàn đêm gờ viền xám xanh trùng màu áo anh và dính liền vai áo, tính là tay áo
        # thì bàn tay mới bị nó đè, cụt phần trên
        ys, xs = np.nonzero(blob)
        yy, xx = np.mgrid[0:c.shape[0], 0:c.shape[1]]
        above = (yy < ys.min() + 6) & (xx < xs.max() - 2)
        sleeve = sleeve & ~above
        sl = sl & ~above
    # tay áo (cả viền tối) đè lên tay mới. Chỉ lấy điểm màu áo sát mảng tay áo lớn: khe phím tối
    # ngả xanh cũng khớp màu áo anh, tính cả thì bàn tay bị thủng lỗ chấm đen
    cuff = dil(sleeve, 1) | (sl & dil(sleeve, 4))
    arm = dil(sleeve, 2)
    # da và điểm sáng của tay cũ dính sát mép áo không phải là áo: không giữ, để tay mới vẽ đè
    # (áo anh tối nên mọi điểm sáng đều không phải áo; áo chị sáng nên chỉ loại màu da)
    notsleeve = skinmask(c) | (c.min(-1) > 150 if n == 'boy' else False)
    return sl, sleeve, arm & ~notsleeve, cuff & ~notsleeve


def sleeve_specks(c, n, sl, sleeve, zone):
    # Chấm đen lẻ (≤ 4 px) của video gốc nằm lọt giữa tay áo, trong vùng `zone`: trả về danh sách
    # (các điểm, màu áo quanh đó) để tô lại. Nếp gấp và viền áo là nét dài nên không bị đụng tới
    x0, y0, x1, y1 = zone
    box = np.zeros(c.shape[:2], bool)
    box[max(0, y0):y1, max(0, x0):x1] = True
    dark = (c.max(-1) < (90 if n == 'girl' else 45)) & ~sl & dil(sleeve, 2) & box
    cloth = sl | sleeve
    out = []
    for comp in components(dark):
        if len(comp) > 4:
            continue
        pts = set(comp)
        ring = {(y + dy, x + dx) for y, x in comp for dy in (-1, 0, 1) for dx in (-1, 0, 1)} - pts
        ring = [(y, x) for y, x in ring if 0 <= y < c.shape[0] and 0 <= x < c.shape[1]]
        if ring and all(cloth[y, x] for y, x in ring):
            col = np.median([c[y, x] for y, x in ring], 0)
            out.append((comp, col))
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
    # Đỉnh tay vịn ghế gỗ lọt vào góc phải dưới của vùng Z: gỗ nâu từng bị coi là viền tay cũ và bị
    # vá màu bàn phím thành một khối xám ở mọi khung
    m[CHAIR[1]:, CHAIR[0]:] = False
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
    # g: vùng Z lúc chị cầm ly (trung vị các khung đó, tức bàn phím thật). Giữ nguyên chi tiết
    # từng phím ở chỗ nhìn thấy; chỉ chỗ bị che (tay áo, tay, viền nâu của tay cũ) mới lấy màu giữa
    # của đoạn sạch ngay sau mép bạc cùng hàng (hàng phím là dải ngang). Trước đây cả hàng bị tô
    # một màu nên lúc chị cầm ly mặt phím mất hết chi tiết
    H, W = g.shape[:2]
    bad = brownish(g) | dil(sleevemask(g, 'girl'), 2) | dil(skinmask(g), 3)
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
        fill = bad[y].copy()
        fill[:a] = False
        p[y, fill] = col
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


def process_sheet(n, name, scale, cols, frames, fps, rev, plate, keys, out_dir=None):
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
        szone = (Z[0] - 10, Z[1] - 30, Z[2], Z[3] + 30)
        sl, sleeve, arm, cuff = sleeve_masks(c, n, szone, blobs[i])
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
        drawn = np.zeros_like(changed)
        if anchors[i] is not None:
            sp = sprite(n, amps_at(i / fps))
            ax, ay = int(round(anchors[i][0])), int(round(anchors[i][1]))
            for yy, xx in zip(*np.nonzero(sp[..., 3])):
                Y, X = ay + OY - PAD + yy, ax + OX - PAD + xx
                if 0 <= Y < CH2 and 0 <= X < CW2 and not cuff[Y, X]:
                    new[Y, X] = sp[yy, xx, :3]
                    drawn[Y, X] = True
        changed |= drawn
        transparent &= ~drawn
        for comp, col in sleeve_specks(c, n, sl, sleeve, szone):
            ys, xs = map(list, zip(*comp))
            if not changed[ys, xs].any():
                new[ys, xs] = col
                changed[ys, xs] = True
        orig = cell(i)
        # Mẩu lẻ còn đục trong lòng màn sát chỗ vừa khoét (điểm sáng / xám của tay cũ không bị coi
        # là da hay viền nâu): làm trong suốt luôn, kẻo thành chấm lấm tấm trên màn code vẽ. Phần
        # đốt tay mới nhô lên lòng màn thì giữ (từng bị coi là mẩu lẻ nên bàn tay bị cắt phẳng)
        opaque = ((orig[..., 3] > 0) & ~changed) | (changed & ~transparent)
        scr = np.zeros_like(opaque)
        scr[sy0:sy1, sx0:sx1] = opaque[sy0:sy1, sx0:sx1]
        near = dil(changed, 2)
        for comp in components(scr):
            ys, xs = map(list, zip(*comp))
            if len(comp) < 60 and near[ys, xs].any() and not drawn[ys, xs].any():
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


# ---------------------------------------------------------------- Bàn đêm
# Bàn đêm (room-desk*) cũng gõ phím trên laptop, nên thay cùng bàn tay với quán cho cả anh lẫn chị:
# hai phòng một bàn tay. Video Bàn đêm vẽ tay chị to thô, tay anh thành cục ngón đan vào nhau.
# Laptop ở Bàn đêm vẽ khác quán (lệch ~10 px, màn to hơn) nên có bàn phím sạch riêng cho từng
# người: mỗi điểm lấy trung vị các khung tay cũ không che điểm đó, điểm luôn bị che lấy màu giữa
# của hàng. Ô Bàn đêm chỉ đục ở phần chuyển động (tay, đầu); lòng màn vẽ dưới ảnh tĩnh nên trong
# khung là trong suốt. Đọc sheet gốc ở DESK_REV (trước khi sửa tay Bàn đêm) nên chạy lại không vẽ
# chồng. `zd` = vùng bàn tay, `screen` = lòng màn (436, 219, 99×51 px gốc), đều theo ô ×2.
DESK_REV = '38003aa'
DESK_ROOMS = {
    'boy': dict(at=(437, 136, 203, 202), interior='room-desk.webp', zd=(0, 236, 190, 330), screen=(0, 166, 196, 268),
                sheets=[('room-desk-loop@2x.webp', 2, 10, 81, 8), ('room-desk-loop.webp', 1, 12, 121, 12),
                        ('room-desk-loop-noel@2x.webp', 2, 10, 81, 8), ('room-desk-loop-noel.webp', 1, 12, 121, 12)]),
    'girl': dict(at=(429, 131, 211, 207), interior='room-desk-girl.webp', zd=(10, 246, 206, 340), screen=(14, 176, 212, 278),
                 sheets=[('room-desk-girl-loop@2x.webp', 2, 10, 81, 8), ('room-desk-girl-loop.webp', 1, 12, 121, 12),
                         ('room-desk-girl-loop-noel@2x.webp', 2, 10, 81, 8),
                         ('room-desk-girl-loop-noel.webp', 1, 12, 121, 12)]),
}


class DeskRoom:
    def __init__(self, n, name, scale, cols, frames):
        cfg = DESK_ROOMS[n]
        ax, ay, aw, ah = cfg['at']
        self.w, self.h = aw * 2, ah * 2
        self.scale, self.cols, self.frames = scale, cols, frames
        self.cw, self.ch = self.w * scale // 2, self.h * scale // 2
        self.arr = np.asarray(git_image(DESK_REV, name)).astype(float)
        interior = np.asarray(git_image(DESK_REV, cfg['interior'])).astype(float)
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


def desk_blob(c, zd):
    x0, y0, x1, y1 = zd
    m = np.zeros(c.shape[:2], bool)
    m[y0:y1, x0:x1] = skinmask(c[y0:y1, x0:x1])
    b = biggest(m)
    return b if b.sum() >= 250 else None


def desk_plate(n):
    # Bàn phím sạch của Bàn đêm từ sheet hi thường
    zd = DESK_ROOMS[n]['zd']
    room = DeskRoom(n, DESK_ROOMS[n]['sheets'][0][0], 2, 10, 81)
    x0, y0, x1, y1 = zd
    obs, ok = [], []
    for i in range(room.frames):
        c = room.comp(i)
        b = desk_blob(c, zd)
        cover = dil(sleevemask(c, n), 3) | dil(skinmask(c), 3) | brownish(c)
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


def process_desk_sheet(n, name, scale, cols, frames, fps, plate, out_dir=None):
    ZD, SCREEN_D = DESK_ROOMS[n]['zd'], DESK_ROOMS[n]['screen']
    room = DeskRoom(n, name, scale, cols, frames)
    comps, blobs = [], []
    for i in range(frames):
        c = room.comp(i)
        comps.append(c)
        blobs.append(desk_blob(c, ZD))
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
        szone = (ZD[0], ZD[1] - 30, ZD[2], ZD[3])
        sl, sleeve, arm, cuff = sleeve_masks(c, n, szone, blobs[i])
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
        drawn = np.zeros_like(changed)
        if anchors[i] is not None:
            # bàn tay Nano Banana, neo như ở quán (cổ tay = góc dưới-phải cục da cũ lùi vào)
            sp = sprite(n, amps_at(i / fps))
            ax_ = int(round(anchors[i][0] - 6 * SCALE[n]))
            ay_ = int(round(anchors[i][1] - 8 * SCALE[n]))
            for yy, xx in zip(*np.nonzero(sp[..., 3])):
                Y, X = ay_ + OY - PAD + yy, ax_ + OX - PAD + xx
                if 0 <= Y < H and 0 <= X < W and not cuff[Y, X]:
                    new[Y, X] = sp[yy, xx, :3]
                    drawn[Y, X] = True
        changed |= drawn
        transparent &= ~drawn
        for comp, col in sleeve_specks(c, n, sl, sleeve, szone):
            ys, xs = map(list, zip(*comp))
            if not changed[ys, xs].any():
                new[ys, xs] = col
                changed[ys, xs] = True
        orig = room.cell(i)
        opaque = ((orig[..., 3] > 0) & ~changed) | (changed & ~transparent)
        scr = np.zeros_like(opaque)
        scr[sy0:sy1, sx0:sx1] = opaque[sy0:sy1, sx0:sx1]
        near = dil(changed, 2)
        for comp in components(scr):
            ys, xs = map(list, zip(*comp))
            if len(comp) < 60 and near[ys, xs].any() and not drawn[ys, xs].any():
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
    ap.add_argument('--boy-scale', type=float, help='thử cỡ tay anh (mặc định SCALE)')
    ap.add_argument('--sheet', help='chỉ làm 1 sheet (tên file)')
    ap.add_argument('--room', choices=['cafe', 'desk', 'all'], default='all', help='chỉ làm quán hoặc Bàn đêm')
    ap.add_argument('--out', help='ghi sheet vào thư mục này thay vì public/chill/scenes')
    args = ap.parse_args()
    if args.boy_scale:
        SCALE['boy'] = args.boy_scale
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
    if args.room in ('desk', 'all'):
        for n, cfg in DESK_ROOMS.items():
            if args.only and n != args.only:
                continue
            names = [x for x in cfg['sheets'] if not args.sheet or x[0] == args.sheet]
            dplate = desk_plate(n) if names else None
            for name, scale, cols, frames, fps in names:
                process_desk_sheet(n, name, scale, cols, frames, fps, dplate, args.out)


if __name__ == '__main__':
    main()
