#!/usr/bin/env python3
# Ảnh bìa video YouTube của kênh Lofi Pixel Cafe (1280×720): cảnh quán + tiêu đề chữ pixel.
#
#   python3 scripts/chill-thumbnail.py --video .chill-video/lofi.mp4 --at 90 \
#     --title "Hanoi rainy night" --sub "lo-fi · 1 hour" --out .chill-video/lofi-thumb.png
#   python3 scripts/chill-thumbnail.py --image public/chill/og.jpg --title "Study with me" --sub "4 phin × 25 min"
#
# Tuỳ chọn:
#   --video <file> --at <giây>  lấy 1 khung hình từ video (cần ffmpeg; mặc định giây thứ 60)
#   --image <file>              hoặc dùng ảnh có sẵn (png, jpg, webp)
#   --title <chữ>               tối đa 2 dòng, tự xuống dòng; viết "\n" để tự ngắt
#   --sub <chữ>                 dòng nhỏ trong ô màu cà phê (trạm · thời lượng)
#   --out <file.png>            mặc định cạnh video/ảnh, đuôi -thumb.png
#
# Font Pixelify Sans (scripts/fonts, giấy phép OFL) không có đủ dấu tiếng Việt —
# viết tiêu đề tiếng Anh; script báo nếu có chữ font không vẽ được.

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'scripts', 'fonts', 'PixelifySans.ttf')
CAT = os.path.join(ROOT, 'public', 'chill', 'cat.webp')
CAT_LOOK = (523, 54, 164, 114)  # khung "look" trong atlas mèo (xem cat.ts)
BRAND = 'LOFI PIXEL CAFE'
CREAM = (255, 244, 230)
INK = (26, 16, 22)
CARAMEL = (232, 178, 125)
COFFEE = (42, 26, 16)


def fail(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


def font(size, weight='Bold'):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except (OSError, ValueError):
        pass  # font không có trục độ đậm → dùng mặc định
    return f


def missing_glyphs(f, text):
    blank = f.getmask('￿').getbbox()
    return sorted({c for c in text if not c.isspace() and f.getmask(c).getbbox() == blank})


def frame_from_video(path, at):
    ffmpeg = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
    out = os.path.join(tempfile.mkdtemp(), 'frame.png')
    try:
        subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(at), '-i', path, '-frames:v', '1', out], check=True)
    except (OSError, subprocess.CalledProcessError):
        fail(f'Không lấy được khung hình từ {path} (cần ffmpeg)')
    return Image.open(out)


def cover(img):
    # Phủ kín 1280×720, cắt phần thừa ở giữa
    img = img.convert('RGB')
    k = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    x, y = (img.width - W) // 2, (img.height - H) // 2
    return img.crop((x, y, x + W, y + H))


def wrap(draw, text, f, width):
    if '\\n' in text or '\n' in text:
        return text.replace('\\n', '\n').split('\n')[:2]
    words, lines = text.split(), ['']
    for w in words:
        test = f'{lines[-1]} {w}'.strip()
        if draw.textlength(test, font=f) <= width or not lines[-1]:
            lines[-1] = test
        elif len(lines) < 2:
            lines.append(w)
        else:
            lines[-1] = f'{lines[-1]} {w}'
    return lines


def shadow_text(draw, xy, text, f, fill, depth=6):
    # Bóng cứng lệch xuống phải, kiểu chữ game pixel
    x, y = xy
    draw.text((x + depth, y + depth), text, font=f, fill=INK)
    draw.text((x, y), text, font=f, fill=fill)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--video')
    p.add_argument('--at', type=float, default=60)
    p.add_argument('--image')
    p.add_argument('--title', required=True)
    p.add_argument('--sub', default='')
    p.add_argument('--out')
    a = p.parse_args()
    src = a.video or a.image
    if not src:
        fail('Cần --video hoặc --image')
    if not os.path.exists(src):
        fail(f'Không thấy file: {src}')

    base = cover(frame_from_video(a.video, a.at) if a.video else Image.open(src)).convert('RGBA')

    # Tối dần sang trái để chữ dễ đọc, cảnh bên phải giữ nguyên
    shade = Image.new('L', (W, 1))
    for x in range(W):
        shade.putpixel((x, 0), int(190 * max(0.0, 1 - x / (W * 0.62)) ** 1.4))
    base = Image.composite(Image.new('RGBA', (W, H), (14, 10, 18, 255)), base, shade.resize((W, H)))
    d = ImageDraw.Draw(base)

    title_f, sub_f, brand_f = font(104), font(42, 'SemiBold'), font(30, 'SemiBold')
    bad = missing_glyphs(title_f, a.title + a.sub)
    if bad:
        print(f'Lưu ý: font pixel không có các chữ {" ".join(bad)} — nên viết không dấu hoặc tiếng Anh.', file=sys.stderr)

    # Góc trên: mèo nhỏ + tên kênh trên nền tối (che luôn nhãn điểm đến của /chill/record)
    cat = Image.open(CAT).convert('RGBA')
    x0, y0, w, h = CAT_LOOK
    cat = cat.crop((x0, y0, x0 + w, y0 + h)).resize((w // 2, h // 2), Image.NEAREST)
    brand_w = d.textlength(BRAND, font=brand_f)
    panel = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(panel).rectangle((0, 0, 48 + cat.width + 16 + brand_w + 28, 40 + cat.height + 20), fill=(14, 10, 18, 250))
    base.alpha_composite(panel)
    base.alpha_composite(cat, (48, 40))
    shadow_text(d, (48 + cat.width + 16, 40 + cat.height - 38), BRAND, brand_f, CREAM, depth=3)

    # Tiêu đề 1–2 dòng + ô màu cà phê, canh từ dưới lên
    lines = wrap(d, a.title, title_f, W * 0.58)
    line_h = 112
    y = H - 72 - (64 if a.sub else 0) - line_h * len(lines)
    for line in lines:
        shadow_text(d, (56, y), line, title_f, CREAM)
        y += line_h
    if a.sub:
        tw = d.textlength(a.sub, font=sub_f)
        box = (56, y + 18, 56 + tw + 44, y + 18 + 64)
        d.rectangle((box[0] + 5, box[1] + 5, box[2] + 5, box[3] + 5), fill=INK)
        d.rectangle(box, fill=CARAMEL)
        d.text((box[0] + 22, box[1] + 8), a.sub, font=sub_f, fill=COFFEE)

    out = a.out or os.path.splitext(src)[0] + '-thumb.png'
    base.convert('RGB').save(out, optimize=True)
    print(f'Xong: {out}')


if __name__ == '__main__':
    main()
