#!/usr/bin/env python3
# Cửa sổ quán, bản chị ký hoạ (thay laptop bằng giá vẽ + sketchbook): từ ảnh Nano Banana 2 + video
# loop Kling (ô kính và trang giấy là nền xanh) ra 3 file cùng định dạng với bản chị gõ laptop:
#   public/chill/scenes/interior-girl-sketch.webp          ảnh tĩnh 1280×720, ô kính + trang giấy trong suốt
#   public/chill/scenes/interior-girl-sketch-loop.webp     121 khung 12fps, 12 cột, ô cuối = mặt nạ
#   public/chill/scenes/interior-girl-sketch-loop@2x.webp  81 khung 8fps, 10 cột, ô cuối = mặt nạ
#
#   python3 scripts/chill-girl-sketch-art.py --nano <ảnh nano 2K> --video <kling.mp4> [--install]
#   (bản đang dùng: .chill-video/girl-cafe-sketch/nano-2-noglasses.png + kling-2.mp4 — mặt nghiêng, không kính)
#
# Trang giấy do code vẽ (sketch.ts) DƯỚI ảnh nội thất: trong ảnh tĩnh và trong từng khung, chỗ xanh
# là trong suốt, tay cầm bút đi qua trang thì giữ tay.
#   - Phòng (khung cửa, quầy, phin, sổ, ly đá) lấy pixel ảnh chị gõ laptop cho nét, giống hệt bản cũ.
#   - Vùng giá vẽ + người lấy từ ảnh Nano; người trong khung lấy từ video, đứng yên thì lấy ảnh tĩnh.
# Cần ffmpeg, Pillow, numpy.

import argparse
import importlib.util
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = os.path.join(ROOT, 'public', 'chill', 'scenes')
_spec = importlib.util.spec_from_file_location('cafe', os.path.join(ROOT, 'scripts', 'chill-girl-cafe-art.py'))
cafe = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cafe)
grow, shrink, big, enclosed, rgba, video_frames = cafe.grow, cafe.shrink, cafe.big, cafe.enclosed, cafe.rgba, cafe.video_frames

# Ô người ngồi (theme cafe girl `character.at` × 2), px 1280 — giữ như bản laptop
X0, Y0, W, H = 858, 232, 422, 440
# Vùng giá vẽ + người lấy từ ảnh Nano (px 1280)
NX0, NY0 = 830, 290
N = 241  # khung video 24fps × 10 giây


def is_green(a, soft=False):
    # Nền xanh thật rất sáng (g ~ 200). Pixel pha nền xanh với nét tối (gọng kính, viền tóc mảnh
    # 1–2 px) chỉ sáng vừa → không coi là nền, giữ lại thành nét tối (khử ám xanh ở clean_fringe)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Pha với nét tối (đỏ / lam thấp) thì phải rất sáng mới là nền, để giữ vành tròng kính mảnh
    dark_mix = np.maximum(r, b) <= 70
    if soft:
        return (g > r + 15) & (g > b + 5) & (g > 165) & (~dark_mix | (g >= 175))
    # Nền xanh video g ≈ 192, nét vành tròng pha nền g ≈ 94–170 → ngưỡng 175
    return (g > r + 45) & (g > b + 35) & np.where(dark_mix, g >= 175, g > 150)


def despill(f, alpha):
    # Kéo kênh xanh lá về r/b ở pixel người (viền tóc, gọng kính ám xanh)
    lim = np.maximum(f[..., 0], f[..., 2]) + 4
    lim = np.where(f[..., :3].max(-1) < 110, np.maximum(f[..., 0], f[..., 2]), lim)
    f[..., 1] = np.where(alpha, np.minimum(f[..., 1], lim), f[..., 1])
    return f


def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def clean_fringe(rgb, alpha, hole=None):
    # Dải mép 2 px quanh người còn ám nền xanh: sau khi khử xanh, tóc đen thành ô liu, quai kem
    # thành vàng chanh. Lấy sắc màu của phần bên trong liền kề (tóc xanh than, quai kem, da), giữ độ
    # sáng của chính pixel mép → hết ám màu mà nét viền vẫn mềm
    # hole: chỗ trong suốt thật (ô kính, trang giấy). Khung video: ranh giới vùng khung cắt ngang
    # khung cửa / quầy (ảnh tĩnh che kín) không phải mép người → không đụng tới
    if hole is None:
        hole = ~alpha
    near = grow(hole, 5) & alpha
    inner = alpha & ~near
    f = rgb.astype(float).copy()
    known = inner.copy()
    for _ in range(6):
        acc = np.zeros_like(f)
        cnt = np.zeros(known.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            k = np.roll(known, (dy, dx), (0, 1))
            acc += np.roll(f, (dy, dx), (0, 1)) * k[..., None]
            cnt += k
        fill = near & ~known & (cnt > 0)
        f[fill] = acc[fill] / cnt[fill][:, None]
        known |= fill
    out = rgb.astype(float).copy()
    got = near & known
    ratio = np.clip(lum(rgb.astype(float)) / np.maximum(lum(f), 1), 0, 1.6)
    out[got] = np.clip(f[got] * ratio[got][:, None], 0, 255)
    # Mép mảnh không có phần bên trong (nét gọng kính chỉ 1–2 px): ép về xám trung tính tối
    lone = near & ~known
    v = out[lone].min(-1)
    out[lone] = np.stack([v, v, v + 6], -1)
    out[..., 1] = np.where(near, np.minimum(out[..., 1], np.maximum(out[..., 0], out[..., 2])), out[..., 1])
    # Mép tối (tóc, gọng kính): đặt hẳn về sắc xanh than của tóc, để WebP nén trộn màu theo khối
    # 2×2 cũng không ngả ô liu
    # chỉ mép tóc (phần bên trong liền kề cũng tối); viền mặt nâu giữ màu
    dk = near & (lum(out) < 80) & (lum(f) < 70)
    v = out[dk].min(-1)
    out[dk] = np.stack([v, v + 3, v + 10], -1)
    return out.astype(int)


def fill_clear(rgb, alpha, rounds=6):
    # Pixel trong suốt vẫn giữ màu (nền xanh của video). WebP nén có mất mát trộn màu sang pixel đục
    # sát bên → viền xanh chanh. Tô pixel trong suốt bằng màu pixel đục gần nhất (loang vài vòng),
    # phần còn lại xám trung tính
    f = rgb.astype(float).copy()
    known = alpha.copy()
    for _ in range(rounds):
        acc = np.zeros_like(f)
        cnt = np.zeros(known.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = np.roll(known, (dy, dx), (0, 1))
            acc += np.roll(f, (dy, dx), (0, 1)) * k[..., None]
            cnt += k
        fill = ~known & (cnt > 0)
        f[fill] = acc[fill] / cnt[fill][:, None]
        known |= fill
    f[~known] = (60, 60, 64)
    return f.astype(int)


def build_static(nano, old):
    girl = np.asarray(Image.open(nano).convert('RGB').resize((1280, 720), Image.LANCZOS)).astype(int)
    out = old.copy()
    reg = girl[NY0:, NX0:]
    o = out[NY0:, NX0:]
    green = is_green(reg) | (is_green(reg, True) & (o[..., 3] == 0))
    o[..., :3] = reg
    o[..., 3] = np.where(green, 0, 255)
    # Phòng giống nhau ở 2 ảnh (quầy, khung cửa, ly đá…) → pixel ảnh cũ cho nét. Bỏ vùng laptop cũ /
    # giá vẽ mới (khác hẳn) và chỗ ảnh cũ trong suốt
    oldr = old[NY0:, NX0:]
    same = (np.abs(oldr[..., :3] - reg).max(-1) < 40) & (oldr[..., 3] > 0) & ~green
    same = shrink(same, 3)
    o[same] = oldr[same]
    o[..., :3] = despill(o[..., :3], o[..., 3] > 0)
    # Khe xanh nhỏ lọt giữa người (kẽ tay, cổ áo) → vá màu xung quanh, không đục lỗ
    a = o[..., 3] > 0
    gap = enclosed(~a, a, 40)
    filled = gap.copy()
    if gap.any():
        f = o[..., :3].astype(float)
        for _ in range(12):
            acc = np.zeros_like(f)
            cnt = np.zeros(gap.shape)
            known = ~gap
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                k = np.roll(known, (dy, dx), (0, 1))
                acc += np.roll(f, (dy, dx), (0, 1)) * k[..., None]
                cnt += k
            fill = gap & (cnt > 0)
            f[fill] = acc[fill] / cnt[fill][:, None]
            gap &= ~fill
        o[..., :3] = f.astype(int)
        o[..., 3] = 255 * (a | filled)
    o[..., :3] = clean_fringe(o[..., :3], o[..., 3] > 0)
    out[..., :3] = fill_clear(out[..., :3], out[..., 3] > 0)
    return out


def build_sheets(static, fr, work):
    st = static[Y0:Y0 + H, X0:X0 + W]
    st_rgb, st_a = st[..., :3], st[..., 3]
    hole = st_a == 0  # ô kính + trang giấy trong ảnh tĩnh
    med = np.median(fr, axis=0)
    green = np.stack([is_green(f) | (is_green(f, True) & hole) for f in fr])
    # Mặt nạ: chỗ video khác ảnh tĩnh (người cử động) + cả người trong ảnh tĩnh quanh chỗ cử động
    moving = (np.abs(fr - st_rgb).max(-1) > 34) & ~green
    mask = big(shrink(grow(moving.any(0), 7), 3), 300)
    mask[H - 2:] = False

    def frame(i):
        f = fr[i].copy()
        gi = green[i]
        a = mask & ~gi
        # Đứng yên + giống ảnh tĩnh → pixel ảnh tĩnh (nét, không rung); đứng yên ở chỗ trong suốt → bỏ
        still = np.abs(fr[i] - med).max(-1) < 20
        same = (np.abs(st_rgb - fr[i]).max(-1) < 40) & (st_a > 0)
        f = np.where((still & same)[..., None], st_rgb, f).astype(int)
        a &= ~(still & hole)
        # Khe nhỏ lọt giữa người → vá thay vì để lỗ
        gap = enclosed(mask & ~a, a, 25) & ~hole
        a |= gap
        f = despill(f, a)
        # Lỗ thật khi ghép: chỗ ảnh tĩnh trong suốt, hoặc trong vùng mặt nạ (ảnh tĩnh bị khoét ở đó)
        f = clean_fringe(f, a, ~a & (hole | mask))
        a[H - 2:] = False
        out = np.zeros((H, W, 4), np.uint8)
        out[..., :3] = fill_clear(f, a).clip(0, 255)
        out[..., 3] = a * 255
        return Image.fromarray(out)

    mask_img = np.zeros((H, W, 4), np.uint8)
    mask_img[..., :3] = 255
    mask_img[..., 3] = mask * 255
    mask_img = Image.fromarray(mask_img)
    cache = {}
    plans = ((2, 1, 12, 121, 'interior-girl-sketch-loop.webp'), (3, 2, 10, 81, 'interior-girl-sketch-loop@2x.webp'))
    for step, scale, cols, frames, name in plans:
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
        sheet.save(os.path.join(work, name), quality=86, method=6)
        print(name, sheet.size, len(idx), 'khung')
    # Đoạn uống: vùng ly đá (px 1280 x 1200–1276, y 495–585) đổi so với khung đầu
    glass = fr[:, 495 - Y0:585 - Y0, 1200 - X0:1276 - X0]
    on = np.nonzero(np.abs(glass - glass[0]).mean((1, 2, 3)) > 12)[0]
    if len(on):
        print(f'đoạn uống ≈ {on.min() / 24:.2f}–{on.max() / 24:.2f} giây')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--nano', required=True, help='ảnh Nano Banana 2 (chị ký hoạ, mặt nghiêng không kính), 16:9')
    p.add_argument('--video', required=True, help='video Kling 10 giây (khung đầu = khung cuối = ảnh Nano)')
    p.add_argument('--work', default=os.path.join(ROOT, '.chill-video', 'girl-cafe-sketch'))
    p.add_argument('--install', action='store_true', help='chép 3 file kết quả vào public/chill/scenes')
    args = p.parse_args()
    os.makedirs(args.work, exist_ok=True)
    old = rgba(os.path.join(SCENES, 'interior-girl.webp'))
    static = build_static(args.nano, old)
    Image.fromarray(static.astype(np.uint8)).save(os.path.join(args.work, 'interior-girl-sketch.png'))
    Image.fromarray(static.astype(np.uint8)).save(os.path.join(args.work, 'interior-girl-sketch.webp'), quality=90, method=6)
    fr = video_frames(args.video, (X0, Y0, W, H))[:N]
    build_sheets(static, fr, args.work)
    if args.install:
        for name in ('interior-girl-sketch.webp', 'interior-girl-sketch-loop.webp', 'interior-girl-sketch-loop@2x.webp'):
            os.replace(os.path.join(args.work, name), os.path.join(SCENES, name))
        print('đã chép vào', SCENES)


if __name__ == '__main__':
    main()
