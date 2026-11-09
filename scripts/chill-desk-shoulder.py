#!/usr/bin/env python3
# Vá vai áo người ngồi phòng Bàn đêm (public/chill/scenes/room-desk.webp).
#
# Bàn đêm vẽ màn hình laptop DƯỚI ảnh nội thất (themes.ts: screenBehind), nên mọi pixel trong
# suốt trong khung màn đều lộ app thiết kế. Lần khoét lòng màn ở cda13a7 lẹm vào vai áo: một
# dải dọc viền vai và dưới cổ áo bị khoét theo, sheet video chỉ có nét viền vai mỏng nên app
# hiện xuyên qua vai thành mảng xám / trắng.
#
# Cách vá: lấy lại pixel vai từ ảnh gốc (2544baa, chưa khoét) — chỉ những pixel tối (vải áo, nét
# viền) nối liền với thân áo còn nguyên. Lòng màn cũ sáng nên không bị lấy lại; chữ tối trên màn
# cũ nằm lọt giữa nền sáng, không nối với vai nên cũng không bị lấy lại.
#
#   python3 scripts/chill-desk-shoulder.py
#
# Cần Pillow, numpy, git (đọc ảnh gốc từ lịch sử).

import io
import os
import subprocess

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REL = 'public/chill/scenes/room-desk.webp'
PATH = os.path.join(ROOT, REL)
ORIGINAL = '2544baa'

# Vùng vai đè lên màn (px ảnh 1280×720): bên phải lòng màn, từ mép trên laptop tới đáy màn
X0, X1, Y0, Y1 = 940, 1080, 430, 550
# Độ sáng tối đa của vải áo / nét viền trong ảnh gốc; lòng màn cũ sáng hơn nhiều
DARK = 110


def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def main():
    raw = subprocess.run(['git', 'show', f'{ORIGINAL}:{REL}'], cwd=ROOT, check=True, capture_output=True).stdout
    old = np.array(Image.open(io.BytesIO(raw)).convert('RGBA'))
    img = Image.open(PATH).convert('RGBA')
    new = np.array(img)

    zone = np.zeros(new.shape[:2], bool)
    zone[Y0:Y1, X0:X1] = True
    hole = (new[..., 3] == 0) & zone
    dark = lum(old.astype(float)) < DARK
    candidate = hole & dark
    # Hạt giống: vải áo còn nguyên (đục, tối) trong vùng vai
    reached = zone & (new[..., 3] == 255) & dark
    # Loang 4 hướng từ thân áo vào các pixel tối đã bị khoét
    grown = np.zeros_like(candidate)
    frontier = reached
    while True:
        nb = np.zeros_like(frontier)
        nb[1:, :] |= frontier[:-1, :]
        nb[:-1, :] |= frontier[1:, :]
        nb[:, 1:] |= frontier[:, :-1]
        nb[:, :-1] |= frontier[:, 1:]
        step = nb & candidate & ~grown
        if not step.any():
            break
        grown |= step
        frontier = step

    new[grown] = old[grown]
    new[grown, 3] = 255
    print(f'vá {int(grown.sum())} / {int(hole.sum())} pixel trong suốt ở vùng vai')
    Image.fromarray(new).save(PATH, 'WEBP', quality=95, alpha_quality=100, method=6)


if __name__ == '__main__':
    main()
