#!/usr/bin/env python3
# Art người ngồi nữ (G2) cho phòng Bàn đêm của /chill: từ ảnh Nano Banana 2 + video loop Kling
# (đã tạo trên Weave, ô kính và lòng màn laptop là nền xanh) ra 3 file cùng định dạng với bản nam:
#   public/chill/scenes/room-desk-girl.webp         ảnh tĩnh 1280×720, ô kính + lòng màn trong suốt
#   public/chill/scenes/room-desk-girl-loop.webp    121 khung 12fps, ô 211×207, 12 cột, ô cuối = mặt nạ
#   public/chill/scenes/room-desk-girl-loop@2x.webp 81 khung 8fps, ô 422×414, 10 cột, ô cuối = mặt nạ
#
#   python3 scripts/chill-girl-desk-art.py --nano <ảnh nano.png> --video <kling.mp4> [--install]
#
# Khác quán: Bàn đêm vẽ màn laptop DƯỚI ảnh nội thất (themes.ts: screenBehind), nên lòng màn trong
# ảnh tĩnh và trong từng khung phải trong suốt; video giữ lòng màn xanh nên khử xanh là đủ.
#   - Cảnh (khung cửa, bàn, laptop, ghế, ly) lấy pixel ảnh gốc room-desk.webp, giống hệt bản nam.
#   - Người lấy từ video Kling; pixel đứng yên mà là cảnh thì lấy ảnh tĩnh cho nét, không rung.
# Cần ffmpeg, Pillow, numpy.

import argparse
import importlib.util
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = os.path.join(ROOT, 'public', 'chill', 'scenes')
_spec = importlib.util.spec_from_file_location('cafe', os.path.join(ROOT, 'scripts', 'chill-girl-cafe-art.py'))
cafe = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cafe)
grow, shrink, big, enclosed, spread, lavender, rgba, video_frames = (
    cafe.grow, cafe.shrink, cafe.big, cafe.enclosed, cafe.spread, cafe.lavender, cafe.rgba, cafe.video_frames)

# Vùng người ngồi nữ (themes.ts desk `girl.character.at` × 2), px 1280: cao hơn ô của nam 10 px
# cho đỉnh tóc, rộng hơn 16 px bên trái cho bàn tay
X0, Y0, W, H = 858, 262, 422, 414
# Vùng quanh người được phép lấy ảnh Nano (ngoài vùng này luôn là ảnh gốc)
ZONE = (850, 250, 1280, 720)
# Ly cà phê đá trên bàn: giữ nguyên bản nam
GLASS = (1196, 496, 1272, 588)
N = 242  # khung video 24fps × ~10 giây
NAMES = ('room-desk-girl.webp', 'room-desk-girl-loop.webp', 'room-desk-girl-loop@2x.webp')


def is_green(a):
    return (a[..., 1] > a[..., 0] + 45) & (a[..., 1] > a[..., 2] + 35)


def dark(a):
    return a[..., :3].max(-1) < 80


def skin(a):
    return (a[..., 0] > 170) & (a[..., 0] > a[..., 1] + 25) & (a[..., 1] > a[..., 2] + 10)


def fill_holes(m):
    # Lấp các lỗ nằm lọt trong m (không thông ra mép ảnh)
    im = Image.fromarray(np.pad(m, 1).astype(np.uint8) * 255)
    ImageDraw.floodfill(im, (0, 0), 128)
    return np.asarray(im)[1:-1, 1:-1] != 128


def build_static(nano, orig, video):
    girl = np.asarray(Image.open(nano).convert('RGB').resize((1280, 720), Image.LANCZOS)).astype(int)
    out = orig.copy()
    opaque = orig[..., 3] > 0
    gg = is_green(girl)
    diff = np.abs(girl - orig[..., :3]).max(-1)
    zone = np.zeros((720, 1280), bool)
    zone[ZONE[1]:ZONE[3], ZONE[0]:ZONE[2]] = True
    zone[GLASS[1]:GLASS[3], GLASS[0]:GLASS[2]] = False
    # Chỗ ảnh Nano khác ảnh gốc: người mới, và nền lộ ra sau khi bỏ người cũ
    differs = (opaque & ~gg & (diff > 45)) | (opaque & gg) | (~opaque & ~gg)
    # Bỏ nét mảnh (vân gỗ Nano vẽ lệch 1–2 px) rồi mới nới ra, để vùng người không loang theo vân gỗ
    solid = grow(shrink(differs & zone, 3), 3)
    z = big(grow(solid, 7) & zone, 2000)
    # Tóc đen của nữ trùng màu tóc / áo của nam nên không "khác": lấp các lỗ lọt giữa người
    z = fill_holes(z) & zone
    # Tóc / áo xanh than của nam (tối, ngả xanh; nét viền gỗ thì ngả đỏ) và da: luôn phải thay, kể cả
    # chỗ tóc đen của nữ đè lên áo nam nên hai ảnh "gần giống nhau"
    cool = (orig[..., :3].max(-1) < 120) & (orig[..., 2] >= orig[..., 0])
    boyish = grow((cool | skin(orig)) & opaque, 5)
    # Trong vùng đó, pixel cảnh (hai ảnh gần giống nhau, không phải người nam) vẫn lấy ảnh gốc
    same = z & opaque & ~gg & (diff < 60) & ~boyish
    z &= ~shrink(same, 3)
    out[z, :3] = girl[z]
    out[z, 3] = 255
    out[z & gg] = 0
    # Đốm xanh nhỏ Nano để sót giữa người (kẽ cổ áo / đuôi tóc) → vá màu xung quanh, không đục lỗ
    box = (slice(ZONE[1], ZONE[3]), slice(ZONE[0], ZONE[2]))
    speck = enclosed((out[box][..., 3] == 0) & z[box], out[box][..., 3] > 0, 80)
    if speck.any():
        out[box][..., :3] = np.where(speck[..., None], inpaint(out[box][..., :3], speck), out[box][..., :3])
        out[box][..., 3] = np.where(speck, 255, out[box][..., 3])
    from_orig = ~z

    # Dải dưới vùng người (đáy ảnh): áo len tím trong Nano chỉnh màu cho khớp áo trong video phía trên
    y1 = Y0 + H
    nb = girl[y1:720, X0:1280]
    lav = lavender(nb) & z[y1:720, X0:1280]
    vrow = np.median(video_frames(video, (X0, y1 - 22, W, 22))[::6], axis=0)
    nrow = girl[y1 - 22:y1, X0:1280]
    if lavender(vrow).any() and lavender(nrow).any():
        shift = vrow[lavender(vrow)].mean(0) - nrow[lavender(nrow)].mean(0)
        sb = out[y1:720, X0:1280]
        sb[lav, :3] = np.clip(nb[lav] + shift, 0, 255)
    return out, from_orig


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


def build_sheets(static, from_orig, fr, work):
    st = static[Y0:Y0 + H, X0:X0 + W]
    st_rgb, st_a = st[..., :3], st[..., 3]
    scene_px = from_orig[Y0:Y0 + H, X0:X0 + W] & (st_a > 0)
    r, g, b = fr[..., 0], fr[..., 1], fr[..., 2]
    # Xanh lẫn nhẹ (viền) chỉ coi là nền ở chỗ ảnh tĩnh trong suốt
    green = ((g > r + 45) & (g > b + 35)) | ((st_a == 0)[None] & (g > r + 15) & (g > b + 5))

    # Mặt nạ: chỗ video khác ảnh tĩnh + cả người nữ trong ảnh tĩnh
    moving = (np.abs(fr - st_rgb).max(-1) > 34) | (green & (st_a > 0))
    mask = big(shrink(grow(moving.any(0), 5), 3), 300) | (~scene_px & (st_a > 0))
    mask[H - 2:] = False  # webp lem màu ở mép ô → 2 hàng đáy để ảnh tĩnh lo

    med = np.median(fr, axis=0)
    lav_st = lavender(st_rgb)
    # Chỗ ảnh tĩnh trong suốt mà video thường là nền xanh. Khung đầu cô quay mặt sang trái, phần lớn
    # video cô nhìn thẳng (lộ vành tai nghe bên phải, gáy) nên "đứng yên + ảnh tĩnh trong suốt" chưa
    # chắc là nền — phải đúng là xanh mới bỏ
    med_green = (med[..., 1] > med[..., 0] + 15) & (med[..., 1] > med[..., 2] + 5)
    # Ly cà phê đá: lúc ly nằm trên bàn (giống khung đầu) lấy nguyên pixel ảnh tĩnh; lúc cầm lên thì
    # cả vùng ly lấy video, không trộn với ảnh tĩnh (trộn sẽ để lại bóng viền ly)
    gx0, gy0, gx1, gy1 = GLASS[0] - X0 - 8, GLASS[1] - Y0 - 8, min(W, GLASS[2] - X0 + 8), GLASS[3] - Y0 + 8
    in_glass = np.zeros((H, W), bool)
    in_glass[gy0:gy1, gx0:gx1] = True
    glass_diff = np.abs(fr[:, gy0:gy1, gx0:gx1] - fr[0, gy0:gy1, gx0:gx1]).mean((1, 2, 3))
    glass_home = glass_diff < 6

    def frame(i):
        f, gi = fr[i].copy(), green[i]
        # Ly thuỷ tinh cầm trước áo: xanh lọt qua ly → vá màu láng giềng thay vì đục lỗ
        hole = gi & (st_a > 0) & mask & ~scene_px
        if hole.any():
            f = inpaint(f, hole)
            gi = gi & ~hole
        a = mask & ~gi
        # Đứng yên + là cảnh → pixel ảnh tĩnh (nét, không rung); đứng yên ở chỗ trong suốt → trong suốt
        still = np.abs(fr[i] - med).max(-1) < 20
        same = (np.abs(st_rgb - med).max(-1) < 60) & scene_px
        use_st = still & same & ~in_glass
        if glass_home[i]:
            use_st |= in_glass & scene_px & (np.abs(fr[i] - fr[0]).max(-1) < 30)
        f = np.where(use_st[..., None], st_rgb, f).astype(int)
        # Viền xanh ngọc tối quanh tóc / kính
        near = grow(gi, 7)
        rr, gg = f[..., 0], f[..., 1]
        teal = ((near & (gg > rr + 10) & (f.max(-1) < 120)) | ((gg > rr + 30) & (f.max(-1) < 140))) & (st_a == 0)
        tealin = (gg > rr + 30) & (f.max(-1) < 140) & (st_a > 0)
        f[tealin] = np.stack([rr[tealin], rr[tealin] + 4, rr[tealin] + 14], -1)
        a &= ~teal & ~(still & (st_a == 0) & med_green)
        f[..., 1] = np.where(near, np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2])), f[..., 1])
        # 4 hàng đáy: áo nối liền dải ảnh tĩnh bên dưới
        bot = np.zeros((H, W), bool)
        bot[H - 4:] = True
        lf = lavender(f)
        f[bot & lf & lav_st] = st_rgb[bot & lf & lav_st]
        # Khe hở nhỏ lọt giữa người (kẽ giữa đuôi tóc và lưng) → vá bằng màu xung quanh
        gap = enclosed(mask & ~a, a, 80)
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
    for step, scale, cols, frames, name in ((2, 1, 12, 121, NAMES[1]), (3, 2, 10, 81, NAMES[2])):
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
    # Đoạn uống: vùng ly đá đổi so với khung đầu. Lúc không uống, scene.ts nhảy từ đầu đoạn tới cuối
    # đoạn, nên chọn cặp khung (trước khi với tay, sau khi đặt ly) giống nhau nhất
    on = np.nonzero(~glass_home)[0]
    if len(on):
        a0, b0 = on.min(), on.max()
        best = min(((np.abs(fr[s] - fr[e]).mean(), s, e) for s in range(max(0, a0 - 18), a0 + 1, 2)
                    for e in range(b0, min(N, b0 + 30), 2)), key=lambda t: t[0])
        print(f'ly rời bàn {a0 / 24:.2f}–{b0 / 24:.2f} giây; sip nên là [{best[1] / 24:.2f}, {best[2] / 24:.2f}] (lệch {best[0]:.1f})')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--nano', required=True, help='ảnh Nano Banana 2 (người nữ ở Bàn đêm, 16:9, nền xanh)')
    p.add_argument('--video', required=True, help='video Kling 10 giây (khung đầu = khung cuối = ảnh nền xanh)')
    p.add_argument('--work', default=os.path.join(ROOT, '.chill-video', 'girl-desk'))
    p.add_argument('--install', action='store_true', help='chép 3 file kết quả vào public/chill/scenes')
    args = p.parse_args()
    os.makedirs(args.work, exist_ok=True)
    orig = rgba(os.path.join(SCENES, 'room-desk.webp'))
    static, from_orig = build_static(args.nano, orig, args.video)
    Image.fromarray(static.astype(np.uint8)).save(os.path.join(args.work, 'room-desk-girl.png'))
    Image.fromarray(static.astype(np.uint8)).save(os.path.join(args.work, NAMES[0]), quality=90, method=6, exact=True)
    fr = video_frames(args.video, (X0, Y0, W, H))[:N]
    build_sheets(static, from_orig, fr, args.work)
    if args.install:
        for name in NAMES:
            os.replace(os.path.join(args.work, name), os.path.join(SCENES, name))
        print('đã chép vào', SCENES)


if __name__ == '__main__':
    main()
