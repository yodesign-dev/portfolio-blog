#!/usr/bin/env python3
# Art người ngồi nữ (G2) cho phòng Café window của /chill: từ ảnh Nano Banana 2 + video loop Kling
# (đã tạo trên Weave) ra 3 file cùng định dạng với bản nam:
#   public/chill/scenes/interior-girl.webp         ảnh tĩnh 1280×720, ô kính trong suốt
#   public/chill/scenes/interior-girl-loop.webp    121 khung 12fps, ô 211×220, 12 cột, ô cuối = mặt nạ
#   public/chill/scenes/interior-girl-loop@2x.webp 81 khung 8fps, ô 422×440, 10 cột, ô cuối = mặt nạ
#
#   python3 scripts/chill-girl-cafe-art.py --nano <ảnh nano.png> --video <kling.mp4> [--work .chill-video/girl-cafe]
#
# Nguyên tắc (xem cách scene.ts vẽ: ảnh tĩnh → khoét mặt nạ → màn laptop → khung người):
#   - Phần cảnh (khung cửa, quầy, laptop, ly) lấy pixel ảnh gốc interior.webp cho nét, giống hệt bản nam.
#   - Cạnh nắp laptop lấy từ khung đầu sheet nam (ảnh gốc vẽ cạnh hơi cong, video nam vẽ thẳng).
#   - Người lấy từ video Kling; nền xanh ở ô kính → trong suốt, viền xanh lem → khử.
#   - Lòng màn laptop để trống (code vẽ màn), trừ khi tay / ly đi ngang qua.
# Cần ffmpeg, Pillow, numpy.

import argparse
import os
import subprocess
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = os.path.join(ROOT, 'public', 'chill', 'scenes')
# Vùng người ngồi (theme cafe `character.at` × 2) và lòng màn laptop (`screen` × 2), px 1280
X0, Y0, W, H = 858, 232, 422, 440
SCR = (872, 438, 872 + 176, 438 + 98)
# Ô kính phải (px 1280): x 869–1187, tới y 499, trừ nắp laptop
PANE_X, PANE_Y1 = (869, 1187), 499
N = 242  # khung video 24fps × ~10 giây


def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA')).astype(int)


def spread(a):
    return a[..., :3].max(-1) - a[..., :3].min(-1)


def grow(m, k):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(k))) > 0


def shrink(m, k):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(k))) > 0


def big(m, minpx):
    # Chỉ giữ các mảng liền nhau từ minpx pixel trở lên
    h, w = m.shape
    seen = np.zeros_like(m)
    out = np.zeros_like(m)
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if len(pts) >= minpx:
            ys, xs = zip(*pts)
            out[list(ys), list(xs)] = True
    return out


def enclosed(m, wall, maxpx):
    # Các mảng của m nhỏ hơn maxpx px mà xung quanh toàn là `wall` (không chạm mép ảnh)
    h, w = m.shape
    seen = np.zeros_like(m)
    out = np.zeros_like(m)
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        pts, ok = [], True
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if not (0 <= ny < h and 0 <= nx < w):
                    ok = False
                elif m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
                elif not m[ny, nx] and not wall[ny, nx]:
                    ok = False
        if ok and len(pts) < maxpx:
            ys, xs = zip(*pts)
            out[list(ys), list(xs)] = True
    return out


def lavender(a):
    return (a[..., 2] > a[..., 1] + 12) & (a[..., 0] > a[..., 1] + 5) & (a[..., :3].max(-1) > 110)


def navy(a):
    return (a[..., :3].max(-1) < 120) & (a[..., 2] - a[..., 0] > 8)


def video_frames(video, crop):
    # Khung video thu về 1280×720 rồi cắt vùng, trả về mảng (n, h, w, 3)
    x, y, w, h = crop
    raw = subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', video, '-vf', f'scale=1280:720:flags=area,crop={w}:{h}:{x}:{y}',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(int)


def build_static(nano, orig, boy_sheet, video):
    # 1) Ghép người từ ảnh Nano vào ảnh gốc; ô kính Nano vẽ caro / vệt trắng → bỏ
    girl = np.asarray(Image.open(nano).convert('RGB').resize((1280, 720), Image.LANCZOS)).astype(int)
    out = orig.copy()
    reg = girl[Y0:Y0 + H, X0:X0 + W]
    ys, xs = np.mgrid[Y0:Y0 + H, X0:X0 + W]
    in_scr = (xs >= SCR[0]) & (xs < SCR[2]) & (ys >= SCR[1]) & (ys < SCR[3])
    in_pane = (xs >= PANE_X[0] - 3) & (xs <= PANE_X[1] + 3) & (ys <= PANE_Y1 + 3) & ~in_scr
    checker = (spread(reg) < 30) & (reg.min(-1) > 100)
    keep = big(in_pane & ~checker, 400)
    # Mảng sáng ít màu nằm lọt giữa người (quai / đệm tai nghe màu kem) không phải caro: mảng nhỏ,
    # mọi pixel quanh nó là người hoặc ngoài ô kính → giữ, không đục lỗ
    keep |= enclosed(in_pane & ~keep, keep | ~in_pane, 200)
    blk = out[Y0:Y0 + H, X0:X0 + W]
    blk[~in_pane, :3] = reg[~in_pane]
    blk[~in_pane, 3] = 255
    blk[in_pane & keep, :3] = reg[in_pane & keep]
    blk[in_pane & keep, 3] = 255
    blk[in_pane & ~keep] = 0

    # 2) Laptop (pixel ít màu ở cả 2 ảnh, không phải áo nam) lấy ảnh gốc
    x0, x1, y0, y1 = 850, 1060, 418, 610
    ob, gb = orig[y0:y1, x0:x1], out[y0:y1, x0:x1]
    take = (spread(ob) < 30) & (spread(gb) < 30) & (ob[..., 3] > 0) & ~grow(navy(ob) & (ob[..., 3] > 0), 5)
    gb[take] = ob[take]

    # 3) Vùng nam đứng trong ảnh gốc (tóc / áo xanh than dễ "giống" tóc đen của nữ) — không lấy ảnh gốc ở đó
    cell = lambda i: boy_sheet[(i // 10) * H:(i // 10) * H + H, (i % 10) * W:(i % 10) * W + W]
    boy = cell(81)[..., 3] > 0
    for i in range(0, 81, 4):
        c = cell(i)
        boy |= (c[..., 3] > 0) & navy(c)
    ro = orig[Y0:Y0 + H, X0:X0 + W]
    boy |= (ro[..., 3] > 0) & navy(ro)
    boy = grow(boy, 9)
    rg = out[Y0:Y0 + H, X0:X0 + W]
    same = (np.abs(ro[..., :3] - rg[..., :3]).max(-1) < 60) & (ro[..., 3] > 0) & (rg[..., 3] > 0) & ~boy
    same = shrink(same, 3)
    rg[same] = ro[same]

    # 4) Cạnh nắp laptop thẳng như khung video nam
    f0 = cell(0)
    edge = np.zeros((H, W), bool)
    edge[418 - Y0:560 - Y0, 0:880 - X0] = True
    edge[418 - Y0:442 - Y0, 0:985 - X0] = True
    use = edge & (f0[..., 3] > 0) & ~((f0[..., :3].max(-1) < 110) & (f0[..., 2] - f0[..., 0] > 10))
    rg[use] = f0[use]

    # 5) Dải dưới vùng người (y 672–720): ảnh gốc còn quần áo nam → áo len tím lấy từ Nano, chỉnh màu
    #    cho khớp áo trong video ngay phía trên
    nb = girl[672:720, X0:1280]
    lav = lavender(nb)
    vrow = np.median(video_frames(video, (X0, 650, W, 22))[::6], axis=0)
    nrow = girl[650:672, X0:1280]
    shift = vrow[lavender(vrow)].mean(0) - nrow[lavender(nrow)].mean(0)
    sb = out[672:720, X0:1280]
    sb[lav, :3] = np.clip(nb[lav] + shift, 0, 255)
    sb[lav, 3] = 255

    # 6) Ly cà phê đá trên quầy giống hệt bản nam
    out[495:585, 1200:1276] = orig[495:585, 1200:1276]
    return out, boy


def build_sheets(static, orig, boy, fr, work):
    st = static[Y0:Y0 + H, X0:X0 + W]
    st_rgb, st_a = st[..., :3], st[..., 3]
    ro = orig[Y0:Y0 + H, X0:X0 + W]
    geo = np.zeros((H, W), bool)
    geo[0:PANE_Y1 - Y0 + 1, PANE_X[0] - X0:PANE_X[1] - X0 + 1] = True
    geo[418 - Y0:, 0:1050 - X0] = False
    pane = (ro[..., 3] == 0) | (st_a == 0) | geo

    r, g, b = fr[..., 0], fr[..., 1], fr[..., 2]
    # Xanh lẫn nhẹ (viền) chỉ coi là nền ở chỗ ảnh tĩnh trong suốt; chỗ ảnh tĩnh có người, tóc / tai
    # nghe ám xanh vẫn là người (khử xanh ở dưới), không đục lỗ
    green = ((g > r + 45) & (g > b + 35)) | ((pane & (st_a == 0))[None] & (g > r + 15) & (g > b + 5))
    sx0, sy0, sx1, sy1 = SCR[0] - X0, SCR[1] - Y0, SCR[2] - X0, SCR[3] - Y0
    in_rect = np.zeros((H, W), bool)
    in_rect[sy0:sy1, sx0:sx1] = True

    # Mặt nạ: chỗ video khác ảnh tĩnh + cả người nữ trong ảnh tĩnh, trừ thân laptop
    moving = (np.abs(fr - st_rgb).max(-1) > 34) | (green & (st_a > 0))
    mask = big(shrink(grow(moving.any(0), 5), 3), 300)
    bezel = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in ((858, 416, 985, 440), (858, 424, 874, 548), (858, 534, 960, 550)):
        bezel[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = True
    lap = np.zeros((H, W), bool)
    lap[418 - Y0:610 - Y0, 0:1060 - X0] = True
    bezel |= lap & (spread(st) < 30) & (st_a > 0) & ~in_rect
    girl_zone = ((np.abs(ro[..., :3] - st_rgb).max(-1) > 60) | boy) & (st_a > 0)
    mask = (mask | girl_zone) & ~bezel
    mask[H - 2:] = False  # webp lem màu ở mép ô → 2 hàng đáy để ảnh tĩnh lo

    # Lòng màn trên ảnh tĩnh: loang từ góc trái trên qua pixel ít màu, lấp theo hàng
    screenish = lambda a: spread(a) < 30
    ss = screenish(st_rgb)
    scr = np.zeros((H, W), bool)
    stack = [(sy0 + 3, sx0 + 3)]
    while stack:
        y, x = stack.pop()
        if not (sy0 <= y < sy1 and sx0 <= x < sx1) or scr[y, x] or not ss[y, x]:
            continue
        scr[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    for y in range(sy0, sy1):
        xs = np.nonzero(scr[y])[0]
        if len(xs):
            scr[y, xs.min():xs.max() + 1] = True

    med = np.median(fr, axis=0)
    scene_px = (np.abs(ro[..., :3] - st_rgb).max(-1) < 40) & (ro[..., 3] > 0) & ~boy
    lav_st = (st_rgb[..., 2] > st_rgb[..., 1] + 12) & (st_rgb[..., 0] > st_rgb[..., 1] + 5)

    def inpaint(f, hole):
        f = f.astype(float).copy()
        known = ~hole
        for _ in range(40):
            if known.all():
                break
            acc = np.zeros_like(f)
            cnt = np.zeros(hole.shape)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                k = np.roll(known, (dy, dx), (0, 1))
                acc += np.roll(f, (dy, dx), (0, 1)) * k[..., None]
                cnt += k
            fill = ~known & (cnt > 0)
            f[fill] = acc[fill] / cnt[fill][:, None]
            known |= fill
        return f

    def frame(i):
        f, gi = fr[i].copy(), green[i]
        # Ly thuỷ tinh cầm trước áo: xanh lọt qua ly → vá màu láng giềng thay vì đục lỗ
        hole = gi & ~pane & mask
        if hole.any():
            f = inpaint(f, hole)
        diff = np.abs(fr[i] - st_rgb).max(-1)
        a = mask & ~(gi & pane)
        # Lòng màn: bỏ pixel UI (ít màu, giống màn trung vị); giữ mảng người lớn (cổ, tay áo, ly)
        person = big(~(scr & screenish(fr[i]) & (np.abs(fr[i] - med).max(-1) < 40)), 150)
        person |= shrink(grow(person, 5), 5) & scr
        over_bezel = bezel & (diff > 50) & ~gi & ~pane & (spread(fr[i]) >= 30)  # tay đi ngang laptop
        a = ((a | in_rect) & person & ~(gi & pane) & ~bezel) | over_bezel
        # Đứng yên + cùng là cảnh → pixel ảnh tĩnh (nét, không rung); đứng yên ở ô kính → trong suốt
        still = np.abs(fr[i] - med).max(-1) < 20
        same = (np.abs(st_rgb - med).max(-1) < 60) & (st_a > 0) & scene_px
        f = np.where((still & same)[..., None], st_rgb, f).astype(int)
        # Viền xanh ngọc tối quanh tóc / kính
        near = grow(gi, 7)
        rr, gg = f[..., 0], f[..., 1]
        teal = ((near & (gg > rr + 10) & (f.max(-1) < 120)) | ((gg > rr + 30) & (f.max(-1) < 140))) & (st_a == 0)
        tealin = (gg > rr + 30) & (f.max(-1) < 140) & (st_a > 0)
        f[tealin] = np.stack([rr[tealin], rr[tealin] + 4, rr[tealin] + 14], -1)
        a &= ~teal & ~(still & (st_a == 0))
        f[..., 1] = np.where(near, np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2])), f[..., 1])
        # 4 hàng đáy: áo nối liền dải ảnh tĩnh bên dưới
        bot = np.zeros((H, W), bool)
        bot[H - 4:] = True
        lf = (f[..., 2] > f[..., 1] + 12) & (f[..., 0] > f[..., 1] + 5)
        f[bot & lf & lav_st] = st_rgb[bot & lf & lav_st]
        # Khe hở nhỏ lọt giữa người (vd. kẽ giữa đuôi tóc và lưng, video hở nền xanh vài khung) →
        # vá bằng màu xung quanh thay vì để lỗ nhìn thấu ra phố
        gap = enclosed(mask & ~a, a, 25)
        if gap.any():
            f = inpaint(f, gap).astype(int)
            a |= gap
        a[H - 2:] = False
        # Khử lem xanh còn lại; pixel tối (gọng kính, viền tóc) kéo hẳn kênh xanh lá về r/b
        lim = np.maximum(f[..., 0], f[..., 2]) + 4
        lim = np.where(f.max(-1) < 110, np.maximum(f[..., 0], f[..., 2]), lim)
        f[..., 1] = np.where(a, np.minimum(f[..., 1], lim), f[..., 1])
        out = np.zeros((H, W, 4), np.uint8)
        out[..., :3] = f.clip(0, 255)
        out[..., 3] = a * 255
        return Image.fromarray(out)

    mask_img = np.zeros((H, W, 4), np.uint8)
    mask_img[..., :3] = 255
    mask_img[..., 3] = mask * 255
    mask_img = Image.fromarray(mask_img)
    cache = {}
    for step, scale, cols, frames, name in ((2, 1, 12, 121, 'interior-girl-loop.webp'), (3, 2, 10, 81, 'interior-girl-loop@2x.webp')):
        cw, ch = W // 2 * scale, H // 2 * scale
        idx = list(range(0, N, step))[:frames]
        rows = -(-(len(idx) + 1) // cols)
        sheet = Image.new('RGBA', (cols * cw, rows * ch), (0, 0, 0, 0))
        for k, i in enumerate(idx + [None]):
            if i is None:
                im = mask_img
            else:
                if i not in cache:
                    cache[i] = frame(i)
                im = cache[i]
            if scale == 1:
                im = im.resize((cw, ch), Image.NEAREST)
            sheet.paste(im, ((k % cols) * cw, (k // cols) * ch))
        sheet.save(os.path.join(work, name), quality=88, method=6)
        print(name, sheet.size, len(idx), 'khung')
    # Đoạn uống: vùng ly đá đổi so với khung đầu
    glass = fr[:, 270:345, 350:410]
    on = np.nonzero(np.abs(glass - glass[0]).mean((1, 2, 3)) > 12)[0]
    if len(on):
        print(f'đoạn uống ≈ {on.min() / 24:.2f}–{on.max() / 24:.2f} giây')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--nano', required=True, help='ảnh Nano Banana 2 (người nữ trong quán, 16:9)')
    p.add_argument('--video', required=True, help='video Kling 10 giây (khung đầu = khung cuối = ảnh nền xanh)')
    p.add_argument('--work', default=os.path.join(ROOT, '.chill-video', 'girl-cafe'))
    p.add_argument('--install', action='store_true', help='chép 3 file kết quả vào public/chill/scenes')
    args = p.parse_args()
    os.makedirs(args.work, exist_ok=True)
    orig = rgba(os.path.join(SCENES, 'interior.webp'))
    boy_sheet = rgba(os.path.join(SCENES, 'interior-loop@2x.webp'))
    static, boy = build_static(args.nano, orig, boy_sheet, args.video)
    Image.fromarray(static.astype(np.uint8)).save(os.path.join(args.work, 'interior-girl.png'))
    Image.fromarray(static.astype(np.uint8)).save(os.path.join(args.work, 'interior-girl.webp'), quality=90, method=6)
    fr = video_frames(args.video, (X0, Y0, W, H))[:N]
    build_sheets(static, orig, boy, fr, args.work)
    if args.install:
        for name in ('interior-girl.webp', 'interior-girl-loop.webp', 'interior-girl-loop@2x.webp'):
            os.replace(os.path.join(args.work, name), os.path.join(SCENES, name))
        print('đã chép vào', SCENES)


if __name__ == '__main__':
    main()
