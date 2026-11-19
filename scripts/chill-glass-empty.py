#!/usr/bin/env python3
"""Tạo sprite "ly rỗng nhìn xuyên" cho Bàn pha phin của /chill.

Lúc đang pha, phần ly phía trên mặt cà phê phải trông như kính rỗng. Sprite này cắt đúng hình
khối nước trong tranh nội thất (cà phê đen + lớp sữa đáy, theo từng điểm ảnh, mép mềm) rồi thay
bằng thứ nhìn thấy qua kính: bậu gỗ và mặt bàn phía sau, lấy màu theo từng hàng từ hai bên ly
nên khớp ánh sáng của tranh. Thành ly, vệt sáng và chân phin sáng hơn nước nên không bị cắt.

scene.ts (paintBrew) vẽ sprite đè lên tranh, cắt ngang tại mặt cà phê.

Chạy: python3 scripts/chill-glass-empty.py [ảnh-xem-thử.png]
Ra:   public/chill/scenes/interior-glass-empty.webp (RGBA, 70×46, đặt tại (470, 540) px ảnh 1280×720)
Vùng ly của interior.webp, interior-girl.webp và interior-girl-sketch.webp giống hệt nhau nên
dùng chung một sprite. Đổi tranh nội thất thì chạy lại.
"""
import sys
from collections import deque
from PIL import Image

SRC = 'public/chill/scenes/interior.webp'
OUT = 'public/chill/scenes/interior-glass-empty.webp'
# Khung sprite trên ảnh 1280×720. Khớp GLASS_EMPTY trong scene.ts
X0, Y0, W, H = 470, 540, 70, 46
# Lòng ly: không loang lên bóng đáy phin (trên) hay viền đen ngoài ly (dưới, hai bên)
TOP, BOTTOM, LEFT, RIGHT = 544, 583, 474, 536
# Lớp bọt nâu trên mặt cà phê nằm ngay trên vùng loang: lấy thêm từ hàng này
FOAM_TOP = 540
SEED = (500, 556)


def lum(p):
    return (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000


def mix(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def liquid(p):
    """0…1: điểm ảnh này là nước trong ly (cà phê đen hoặc sữa đặc) tới mức nào."""
    coffee = max(0.0, min(1.0, (95 - lum(p)) / 45))
    # Sữa: vàng kem (đỏ cao, xanh dương thấp). Thành ly cũng sáng nhưng gần trắng nên bị loại
    milk = max(0.0, min(1.0, (p[0] - p[2] - 55) / 30)) if p[0] > 150 and p[1] > 120 else 0.0
    return max(coffee, milk)


def main():
    art = Image.open(SRC).convert('RGBA')
    px = art.load()
    inside = lambda x, y: LEFT <= x <= RIGHT and TOP <= y <= BOTTOM

    # Loang từ giữa ly qua các điểm "là nước": thành ly sáng chặn lại, nên không lem ra ngoài
    seen = {SEED}
    queue = deque([SEED])
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in seen and inside(nx, ny) and liquid(px[nx, ny]) > 0.5:
                seen.add((nx, ny))
                queue.append((nx, ny))

    # Lấp chỗ sót giữa lòng ly: vạch sẫm chỗ cà phê giáp sữa, đốm tối trong sữa (cột nào đã có
    # nước ở trên và ở dưới thì khoảng giữa cũng là nước, trừ vệt phản chiếu gần trắng)
    for x in range(LEFT, RIGHT + 1):
        ys = [y for (sx, y) in seen if sx == x]
        if ys:
            seen.update((x, y) for y in range(min(ys), max(ys) + 1) if lum(px[x, y]) < 185)
    # Lớp bọt nâu trên cùng: cùng bề ngang với hàng nước đầu tiên, bỏ thành ly sáng
    first = sorted(x for (x, y) in seen if y == TOP + 6)
    for y in range(FOAM_TOP, TOP + 6):
        seen.update((x, y) for x in range(first[0], first[-1] + 1) if lum(px[x, y]) < 150)

    def behind(y):
        # Màu nền hai bên ly ở hàng này. Gần đáy, bên trái là bóng đổ của ly → chỉ lấy bên phải
        xs = list(range(540, 548)) + (list(range(460, 468)) if y < 572 else [])
        return tuple(sum(px[x, y][i] for x in xs) // len(xs) for i in range(3))

    rows = {}
    for x, y in seen:
        a, b = rows.get(y, (x, x))
        rows[y] = (min(a, x), max(b, x))

    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    edge_l, edge_r = rows[TOP + 6]
    for y in range(FOAM_TOP, BOTTOM + 1):
        if y not in rows:
            continue
        base = mix(behind(y), (244, 232, 214), 0.12)
        if y < TOP + 8:
            base = mix(base, (24, 12, 6), min(0.30, 0.30 * (TOP + 8 - y) / 8))  # bóng đáy phin
        for x in range(LEFT, RIGHT + 1):
            # Mép mềm: điểm sát vùng nước lấy độ trong theo mức "là nước" của chính nó
            near = (x, y) in seen or any(n in seen for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            if not near:
                continue
            alpha = 1.0 if (x, y) in seen else liquid(px[x, y])
            if alpha <= 0.02:
                continue
            # Vệt sáng dọc ở cột cố định (thẳng đứng, không bậc thang theo đáy bo), mờ dần về đáy
            fade = max(0.0, min(1.0, (574 - y) / 8))
            color = base
            if x - edge_l < 3:
                color = mix(color, (255, 246, 230), 0.35 * fade)
            elif 7 <= x - edge_l <= 8:
                color = mix(color, (255, 246, 230), 0.14 * fade)
            elif edge_r - x < 4:
                color = mix(color, (255, 246, 230), 0.20 * fade)
            out.putpixel((x - X0, y - Y0), (*color, round(alpha * 255)))

    out.save(OUT, lossless=True)
    print(f'{OUT}: {W}×{H}, {len(seen)} điểm ảnh nước, hàng {min(rows)}–{max(rows)}, cột {edge_l}–{edge_r}')

    if len(sys.argv) > 1:
        # Xem thử: tranh gốc | ly rỗng hẳn | rỗng nửa trên, phóng ×6
        box = (452, 516, 556, 600)
        full = art.copy()
        full.alpha_composite(out, (X0, Y0))
        half = art.copy()
        half.alpha_composite(out.crop((0, 0, W, 16)), (X0, Y0))
        sheet = Image.new('RGB', (104 * 6 * 3 + 40, 84 * 6 + 20), (27, 26, 33))
        for i, im in enumerate((art, full, half)):
            tile = Image.new('RGBA', (104, 84), (60, 40, 30, 255))
            tile.alpha_composite(im.crop(box))
            sheet.paste(tile.convert('RGB').resize((104 * 6, 84 * 6), Image.NEAREST), (10 + i * (104 * 6 + 10), 10))
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
