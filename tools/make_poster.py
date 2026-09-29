# -*- coding: utf-8 -*-
"""Generate the company game poster (with scannable QR code).

Output: assets/img/poster.png   (1500 x 2121, A4 ratio @ ~180dpi)
Run:    python tools/make_poster.py
"""
import os
import sys
import random
from PIL import Image, ImageDraw, ImageFont
import qrcode

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from poster_art import sprite

W, H = 1500, 2121
M = 90
URL = "https://siinaiiovalle-droid.github.io/startide-arcade/"
OUT = os.path.join("assets", "img", "poster.png")

CYAN = (56, 225, 255)
VIOLET = (122, 92, 255)
PINK = (255, 77, 157)
AMBER = (255, 176, 32)
GREEN = (46, 230, 168)
RED = (255, 92, 108)
WHITE = (255, 255, 255)
TEXT = (233, 239, 252)
MUTED = (150, 170, 205)

FONT_DIR = "C:/Windows/Fonts/"
F_BOLD = FONT_DIR + "msyhbd.ttc"
F_REG = FONT_DIR + "msyh.ttc"
F_MONO = FONT_DIR + "consola.ttf"


def f(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def tw(draw, text, font):
    return draw.textlength(text, font=font)


def glow(w, h, color, strength):
    """Radial glow layer."""
    layer = Image.new("RGBA", (w, h), color + (0,))
    mask = Image.radial_gradient("L").resize((w, h), Image.LANCZOS)
    mask = mask.point(lambda v: int((255 - v) * strength))
    layer.putalpha(mask)
    return layer


def rounded_gradient(size, radius, c1, c2):
    w, h = size
    grad = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(grad)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix(c1, c2, y / max(1, h - 1)))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    out = grad.convert("RGBA")
    out.putalpha(mask)
    return out


def gradient_text(img, xy, text, font, c1, c2):
    d = ImageDraw.Draw(img)
    x, y = xy
    n = max(1, len(text) - 1)
    for i, ch in enumerate(text):
        d.text((x, y), ch, font=font, fill=mix(c1, c2, i / n))
        x += tw(d, ch, font)


def shadow(d, box, radius, layers=7):
    x0, y0, x1, y1 = box
    for i in range(layers, 0, -1):
        o = i * 3
        d.rounded_rectangle([x0 - 6 + o, y0 + o, x1 + 6 + o, y1 + o], radius=radius, fill=(0, 0, 0, 14))


def gradient_text(img, xy, text, font, c1, c2, glow_col=None, blur=9):
    from PIL import ImageFilter
    x, y = xy
    n = max(1, len(text) - 1)
    if glow_col:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        cx = x
        for ch in text:
            ld.text((cx, y), ch, font=font, fill=glow_col + (255,))
            cx += ld.textlength(ch, font=font)
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
        glow_img = Image.new("RGBA", img.size, glow_col + (0,))
        glow_img.putalpha(layer.split()[3].point(lambda v: int(v * 0.5)))
        img.paste(glow_img, (0, 0), glow_img)
    d = ImageDraw.Draw(img)
    cx = x
    for i, ch in enumerate(text):
        d.text((cx, y), ch, font=font, fill=mix(c1, c2, i / n))
        cx += d.textlength(ch, font=font)


def qr_dots(url, target):
    """Rounded-dot QR: finder patterns stay solid so scanners still lock on."""
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=1, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)
    scale = max(1, target // n)
    img = Image.new("RGB", (n * scale, n * scale), "white")
    d = ImageDraw.Draw(img)
    for r in range(n):
        for c in range(n):
            if not m[r][c]:
                continue
            x, y = c * scale, r * scale
            col = mix((10, 16, 38), (72, 46, 140), r / n)
            finder = (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)
            if finder:
                d.rectangle([x, y, x + scale - 1, y + scale - 1], fill=col)
            else:
                pad = scale * 0.06
                d.ellipse([x + pad, y + pad, x + scale - pad, y + scale - pad], fill=col)
    return img


def draw_icon(kind, box):
    """White glyph on a gradient tile."""
    size = box
    tile = rounded_gradient((size, size), 30, (30, 45, 90), (18, 26, 52))
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(tile)
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    u = size / 100.0

    if kind == "mario":  # mushroom
        d.rounded_rectangle([cx - 20 * u, cy - 2 * u, cx + 20 * u, cy + 24 * u], radius=8 * u, fill=WHITE)
        d.ellipse([cx - 30 * u, cy - 40 * u, cx + 30 * u, cy + 6 * u], fill=WHITE)
        d.ellipse([cx - 16 * u, cy - 30 * u, cx - 4 * u, cy - 18 * u], fill=(30, 45, 90))
        d.ellipse([cx + 4 * u, cy - 30 * u, cx + 16 * u, cy - 18 * u], fill=(30, 45, 90))
    elif kind == "shooter":  # fighter
        d.polygon([(cx, cy - 34 * u), (cx + 22 * u, cy + 26 * u), (cx, cy + 12 * u), (cx - 22 * u, cy + 26 * u)], fill=WHITE)
        d.polygon([(cx - 34 * u, cy - 6 * u), (cx - 10 * u, cy + 2 * u), (cx - 34 * u, cy + 14 * u)], fill=WHITE)
        d.polygon([(cx + 34 * u, cy - 6 * u), (cx + 10 * u, cy + 2 * u), (cx + 34 * u, cy + 14 * u)], fill=WHITE)
        d.rectangle([cx - 3 * u, cy - 40 * u, cx + 3 * u, cy - 26 * u], fill=WHITE)
    elif kind == "breakout":  # bricks + ball + paddle
        for i in range(4):
            d.rectangle([cx - 32 * u + i * 17 * u, cy - 34 * u, cx - 20 * u + i * 17 * u, cy - 22 * u], fill=WHITE)
        d.ellipse([cx - 7 * u, cy - 8 * u, cx + 7 * u, cy + 6 * u], fill=WHITE)
        d.rounded_rectangle([cx - 26 * u, cy + 22 * u, cx + 26 * u, cy + 32 * u], radius=5 * u, fill=WHITE)
    elif kind == "snake":  # body + head
        pts = [(cx + 26 * u, cy + 24 * u), (cx + 8 * u, cy + 24 * u), (cx + 8 * u, cy + 2 * u),
               (cx - 14 * u, cy + 2 * u), (cx - 14 * u, cy - 18 * u)]
        for i, p in enumerate(pts):
            r = (11 - i * 1.2) * u
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=WHITE)
        d.ellipse([cx - 26 * u, cy - 32 * u, cx - 14 * u, cy - 20 * u], fill=WHITE)
    elif kind == "tetris":  # L piece
        s, g = 15 * u, 1.5 * u
        cells = [(0, 0), (0, 1), (0, 2), (1, 2)]
        for r, c in cells:
            x0 = cx - 30 * u + c * (s + g)
            y0 = cy - 24 * u + r * (s + g)
            d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=3 * u, fill=WHITE)
    else:  # 2048
        d.rounded_rectangle([cx - 32 * u, cy - 32 * u, cx + 32 * u, cy + 32 * u], radius=8 * u, fill=WHITE)
        t = f(F_BOLD, int(size * 0.24))
        d.text((cx, cy), "2048", font=t, fill=(20, 30, 60), anchor="mm")
    return img


def make_qr(max_px):
    """QR sized so every module keeps an integer pixel size (crisp & scannable)."""
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=1, border=2)
    qr.add_data(URL)
    qr.make(fit=True)
    im = qr.make_image(fill_color=(8, 13, 26), back_color="white").convert("RGB")
    w, h = im.size
    k = max(1, max_px // w)
    return im.resize((w * k, h * k), Image.NEAREST)


def main():
    random.seed(20260928)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img = Image.new("RGB", (W, H), (6, 10, 20))
    d0 = ImageDraw.Draw(img)
    for y in range(H):
        d0.line([(0, y), (W, y)], fill=mix((6, 10, 20), (12, 18, 40), y / H))

    # glows
    for gl in [(-260, -320, 1100, CYAN, 0.40), (900, 520, 1200, VIOLET, 0.36), (-180, 1500, 1000, PINK, 0.22)]:
        x, y, s, c, a = gl
        layer = glow(s, s, c, a)
        img.paste(layer, (x, y), layer)

    d = ImageDraw.Draw(img, "RGBA")
    # grid
    for x in range(0, W, 75):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 8))
    for y in range(0, H, 75):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 8))
    # stars
    for _ in range(260):
        x, y = random.randint(0, W), random.randint(0, H)
        r = random.choice([1, 1, 1, 2])
        a = random.randint(30, 130)
        col = random.choice([(255, 255, 255), CYAN, (180, 200, 255)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (a,))

    # ---------- header ----------
    logo = rounded_gradient((84, 84), 22, CYAN, VIOLET)
    img.paste(logo, (M, 92), logo)
    d.text((M + 42, 92 + 42), "S", font=f(F_BOLD, 46), fill=WHITE, anchor="mm")
    d.text((M + 108, 96), "星潮互动", font=f(F_BOLD, 40), fill=TEXT)
    d.text((M + 110, 146), "STARTIDE INTERACTIVE", font=f(F_REG, 20), fill=MUTED)
    tag = "扫码即玩 · 免安装 · 全端可玩"
    d.text((W - M, 100), tag, font=f(F_REG, 24), fill=MUTED, anchor="ra")
    d.text((W - M, 136), "Web Games · Play Instantly", font=f(F_REG, 18), fill=(110, 130, 165), anchor="ra")

    d.line([(M, 196), (W - M, 196)], fill=(255, 255, 255, 26), width=2)

    # ---------- hero ----------
    gradient_text(img, (M, 250), "打开就能玩", f(F_BOLD, 118), WHITE, mix(CYAN, WHITE, 0.55), glow_col=CYAN)
    gradient_text(img, (M, 400), "60 秒上手 · 零下载", f(F_BOLD, 62), CYAN, PINK)
    d.text((M, 496), "超级玛丽 · 打飞机 · 打砖块 · 贪吃蛇 · 俄罗斯方块 · 2048", font=f(F_REG, 30), fill=MUTED)
    d.text((M, 552), "每天新增 2-3 款经典小游戏，手机 · 平板 · 电脑全端即点即玩", font=f(F_REG, 26), fill=(125, 145, 180))

    # pills
    px = M
    for label in ["无需下载", "登录即玩", "全球同服", "每天上新"]:
        w = tw(d, label, f(F_REG, 24)) + 44
        d.rounded_rectangle([px, 606, px + w, 654], radius=24, outline=(56, 225, 255, 90), width=2)
        d.text((px + w / 2, 630), label, font=f(F_REG, 24), fill=(200, 225, 255), anchor="mm")
        px += w + 16

    # ---------- game cards ----------
    games = [
        ("超级玛丽", "Platformer", "mushroom", RED),
        ("打飞机", "Shoot 'em up", "ship", CYAN),
        ("打砖块", "Breakout", "brickbot", AMBER),
        ("贪吃蛇", "Snake", "worm", GREEN),
        ("俄罗斯方块", "Tetris", "block", VIOLET),
        ("2048", "Puzzle", "number", PINK),
    ]
    cw = (W - 2 * M - 2 * 30) // 3
    ch = 216
    for i, (name, en, kind, color) in enumerate(games):
        col, row = i % 3, i // 3
        x = M + col * (cw + 30)
        y = 700 + row * (ch + 30)
        shadow(d, [x, y, x + cw, y + ch], 24, layers=5)
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=24, fill=(16, 25, 46, 235))
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=24, outline=(255, 255, 255, 26), width=2)
        # accent bar
        d.rounded_rectangle([x + 26, y + 26, x + 34, y + ch - 26], radius=4, fill=color + (220,))
        icon = sprite(kind, 132, color)
        img.paste(icon, (x + 54, y + (ch - 132) // 2), icon)
        d.text((x + 196, y + 76), name, font=f(F_BOLD, 36), fill=TEXT)
        d.text((x + 198, y + 130), en, font=f(F_REG, 22), fill=MUTED)
        d.text((x + cw - 26, y + 24), "NO." + str(i + 1).zfill(2), font=f(F_MONO, 20), fill=(112, 132, 168), anchor="ra")

    # ---------- QR block ----------
    qy = 700 + 2 * (ch + 30) + 24
    qh = 470
    d.rounded_rectangle([M, qy, W - M, qy + qh], radius=30, fill=(245, 248, 255))
    qr = qr_dots(URL, 380)
    qs = qr.size[0]
    qx = W - M - 60 - qs
    qy_qr = qy + (qh - qs) // 2
    img.paste(qr, (qx, qy_qr))
    qr.save(os.path.join("assets", "img", "qr.png"))
    # center badge
    bs = 88
    badge = rounded_gradient((bs, bs), 24, CYAN, VIOLET)
    bx = qx + (qs - bs) // 2
    by = qy_qr + (qs - bs) // 2
    frame = Image.new("RGB", (bs + 16, bs + 16), (245, 248, 255))
    frame.paste(badge, (8, 8), badge)
    img.paste(frame, (bx - 8, by - 8))
    d.text((bx + bs / 2, by + bs / 2), "S", font=f(F_BOLD, 52), fill=WHITE, anchor="mm")

    tx = M + 56
    d.text((tx, qy + 70), "扫码立即开玩", font=f(F_BOLD, 56), fill=(10, 16, 30))
    d.text((tx, qy + 158), "打开手机相机扫一扫，秒进游戏大厅", font=f(F_REG, 26), fill=(90, 105, 130))
    d.text((tx, qy + 214), URL, font=f(F_MONO, 26), fill=(20, 110, 200))
    d.text((tx, qy + 288), "· 免安装，不占手机空间", font=f(F_REG, 24), fill=(70, 88, 115))
    d.text((tx, qy + 330), "· 登录即注册，成绩自动留存排行榜", font=f(F_REG, 24), fill=(70, 88, 115))
    d.text((tx, qy + 372), "· 每天更新，越玩越多", font=f(F_REG, 24), fill=(70, 88, 115))

    # ---------- footer ----------
    fy = qy + qh + 60
    d.line([(M, fy), (W - M, fy)], fill=(255, 255, 255, 26), width=2)
    d.text((M, fy + 46), "星潮互动 STARTIDE INTERACTIVE", font=f(F_BOLD, 30), fill=TEXT)
    d.text((W - M, fy + 46), "bd@startide.example  ·  ir@startide.example", font=f(F_REG, 22), fill=MUTED, anchor="ra")
    d.text((M, fy + 104), "Play instantly. No download. Any device — anywhere in the world.",
           font=f(F_REG, 24), fill=(125, 145, 180))

    img.save(OUT, "PNG", optimize=True)
    print("saved:", OUT, img.size, "qr_box:", qx, qy_qr, qs)


if __name__ == "__main__":
    main()
