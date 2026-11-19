#!/usr/bin/env python3
"""Tạo sprite ly dưới phin của /chill: ly rỗng nhìn xuyên, món đen, món bạc xỉu.

Lúc đang pha, phần ly phía trên mặt cà phê phải trông như kính rỗng. Sprite này cắt đúng hình
khối nước trong tranh nội thất (cà phê đen + lớp sữa đáy, theo từng điểm ảnh, mép mềm) rồi thay
bằng thứ nhìn thấy qua kính: bậu gỗ và mặt bàn phía sau, lấy màu theo từng hàng từ hai bên ly
nên khớp ánh sáng của tranh. Thành ly, vệt sáng và chân phin sáng hơn nước nên không bị cắt.

scene.ts (paintBrew) vẽ sprite ly rỗng đè lên tranh, cắt ngang tại mặt cà phê.

Hai sprite món (paintDrink) dùng cùng hình cắt đó: tranh gốc là cà phê sữa, sprite "den" đổi lớp
sữa đáy thành cà phê, sprite "bacxiu" đổi thân ly thành sữa. Trước đây tô bằng khối chữ nhật nên
lệch dáng ly.

Chạy: python3 scripts/chill-glass-empty.py [ảnh-xem-thử.png]
Ra:   public/chill/scenes/interior-glass-{empty,den,bacxiu}.webp (RGBA, 70×46, đặt tại (470, 540)
      px ảnh 1280×720)
Vùng ly của interior.webp, interior-girl.webp và interior-girl-sketch.webp giống hệt nhau nên
dùng chung một sprite. Đổi tranh nội thất thì chạy lại.
"""
import sys
from collections import deque
from PIL import Image

SRC = 'public/chill/scenes/interior.webp'
OUT = 'public/chill/scenes/interior-glass-{}.webp'
# Khung sprite trên ảnh 1280×720. Khớp GLASS_EMPTY trong scene.ts
X0, Y0, W, H = 470, 540, 70, 46
# Lòng ly: không loang lên bóng đáy phin (trên) hay viền đen ngoài ly (dưới, hai bên)
TOP, BOTTOM, LEFT, RIGHT = 544, 583, 474, 536
# Lớp bọt nâu trên mặt cà phê nằm ngay trên vùng loang: lấy thêm từ hàng này
FOAM_TOP = 540
# Hàng đầu của lớp sữa đáy trong tranh, và hàng bạc xỉu bắt đầu thành sữa (ngay dưới lớp bọt)
MILK_Y = 568
MILK_FROM = 544
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

    edge_l, edge_r = rows[TOP + 6]

    def render(y_from, y_to, color_at, solid=False):
        """Sprite phủ vùng nước từ hàng y_from tới y_to; color_at(x, y) → màu.

        solid (sprite món): nước mới phải che kín nước cũ, nên mép đục hơn và mọi điểm tối còn
        sót trong bề ngang lòng ly (khe cà phê giữa các vệt phản chiếu) cũng được phủ."""
        img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for y in range(y_from, y_to + 1):
            if y not in rows:
                continue
            for x in range(LEFT, RIGHT + 1):
                # Mép mềm: điểm sát vùng nước lấy độ trong theo mức "là nước" của chính nó
                near = (x, y) in seen or any(n in seen for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
                gap = solid and rows[y][0] <= x <= rows[y][1] and lum(px[x, y]) < 120
                if not near and not gap:
                    continue
                alpha = 1.0 if (x, y) in seen or gap else liquid(px[x, y])
                if solid and alpha > 0.02:
                    alpha = max(alpha, 0.8)
                if alpha > 0.02:
                    img.putpixel((x - X0, y - Y0), (*color_at(x, y), round(alpha * 255)))
        return img

    def average(x0, y0, x1, y1):
        pts = [px[x, y] for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
        return tuple(sum(p[i] for p in pts) // len(pts) for i in range(3))

    # Ly rỗng: thứ thấy qua kính, thêm bóng đáy phin và vệt sáng dọc ở cột cố định (thẳng đứng,
    # không bậc thang theo đáy bo), mờ dần về đáy
    def empty_at(x, y):
        color = mix(behind(y), (244, 232, 214), 0.12)
        if y < TOP + 8:
            color = mix(color, (24, 12, 6), min(0.30, 0.30 * (TOP + 8 - y) / 8))  # bóng đáy phin
        fade = max(0.0, min(1.0, (574 - y) / 8))
        if x - edge_l < 3:
            return mix(color, (255, 246, 230), 0.35 * fade)
        if 7 <= x - edge_l <= 8:
            return mix(color, (255, 246, 230), 0.14 * fade)
        if edge_r - x < 4:
            return mix(color, (255, 246, 230), 0.20 * fade)
        return color

    # Cà phê đen: lớp sữa đáy thành cà phê, cùng màu cà phê của tranh, vệt phản chiếu nâu bên phải
    coffee = average(490, 552, 512, 564)

    def black_at(x, y):
        if 3 <= edge_r - x <= 5:
            return mix(coffee, (72, 46, 32), 0.55 * max(0.0, min(1.0, (578 - y) / 6)))
        return coffee

    # Bạc xỉu: thân ly thành sữa (màu lớp sữa của tranh), giữ lớp bọt nâu trên cùng, 4 hàng giáp
    # bọt là cà phê loang vào sữa
    milk = average(494, 572, 514, 577)

    def milky_at(x, y):
        color = milk
        if y < MILK_FROM + 4:
            color = mix((120, 74, 40), milk, (y - MILK_FROM + 1) / 5)
        if edge_r - x < 4:
            return mix(color, (246, 236, 200), 0.55)
        if x - edge_l < 2:
            return mix(color, (150, 110, 60), 0.25)
        return color

    sprites = {
        'empty': render(FOAM_TOP, BOTTOM, empty_at),
        'den': render(MILK_Y - 2, BOTTOM, black_at, solid=True),
        'bacxiu': render(MILK_FROM, MILK_Y + 1, milky_at, solid=True),
    }
    for name, img in sprites.items():
        img.save(OUT.format(name), lossless=True)
    out = sprites['empty']
    print(f'{OUT.format("*")}: {W}×{H}, {len(seen)} điểm ảnh nước, hàng {min(rows)}–{max(rows)}, cột {edge_l}–{edge_r}')

    if len(sys.argv) > 1:
        # Xem thử: tranh gốc | ly rỗng hẳn | rỗng nửa trên | đen | bạc xỉu, phóng ×6
        box = (452, 516, 556, 600)
        views = [art]
        for layer in (out, out.crop((0, 0, W, 16)), sprites['den'], sprites['bacxiu']):
            im = art.copy()
            im.alpha_composite(layer, (X0, Y0))
            views.append(im)
        sheet = Image.new('RGB', ((104 * 6 + 10) * len(views) + 10, 84 * 6 + 20), (27, 26, 33))
        for i, im in enumerate(views):
            tile = Image.new('RGBA', (104, 84), (60, 40, 30, 255))
            tile.alpha_composite(im.crop(box))
            sheet.paste(tile.convert('RGB').resize((104 * 6, 84 * 6), Image.NEAREST), (10 + i * (104 * 6 + 10), 10))
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
