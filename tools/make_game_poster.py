# -*- coding: utf-8 -*-
"""Premium per-game poster with a deep-link QR code (scans straight into that game).

Reads metadata from assets/js/games/catalog.js and writes:
  assets/img/posters/<id>.png   1200 x 1460 poster
  assets/img/qr/<id>.png        styled dot QR code

Usage:
  python tools/make_game_poster.py                 # all games
  python tools/make_game_poster.py mario snake     # only these ids
"""
import os
import re
import sys
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode

try:
    import numpy as np
    import cv2
    HAS_CV = True
except Exception:
    HAS_CV = False

W, H = 1200, 1400
M = 72
SITE = "https://siinaiiovalle-droid.github.io/startide-arcade/"
CATALOG = os.path.join("assets", "js", "games", "catalog.js")
OUT_DIR = os.path.join("assets", "img", "posters")
QR_DIR = os.path.join("assets", "img", "qr")
FONT_DIR = "C:/Windows/Fonts/"

CYAN = (56, 225, 255)
VIOLET = (122, 92, 255)
PINK = (255, 77, 157)
WHITE = (255, 255, 255)
TEXT = (233, 239, 252)
MUTED = (150, 170, 205)
CARD = (247, 249, 255)


def f(name, size):
    try:
        return ImageFont.truetype(FONT_DIR + name, size)
    except Exception:
        return ImageFont.load_default()


def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def glow(size, color, strength):
    layer = Image.new("RGBA", (size, size), color + (0,))
    mask = Image.radial_gradient("L").resize((size, size), Image.LANCZOS)
    layer.putalpha(mask.point(lambda v: int((255 - v) * strength)))
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


def shadow(d, box, radius, layers=7):
    x0, y0, x1, y1 = box
    for i in range(layers, 0, -1):
        o = i * 3
        d.rounded_rectangle([x0 - 6 + o, y0 + o, x1 + 6 + o, y1 + o], radius=radius, fill=(0, 0, 0, 14))


def gradient_text(img, xy, text, font, c1, c2, glow_col=None, blur=9):
    """Draw gradient text with an optional bloom."""
    x, y = xy
    n = max(1, len(text) - 1)
    if glow_col:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        cx = x
        for i, ch in enumerate(text):
            ld.text((cx, y), ch, font=font, fill=glow_col + (255,))
            cx += ld.textlength(ch, font=font)
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
        alpha = layer.split()[3].point(lambda v: int(v * 0.5))
        glow_img = Image.new("RGBA", img.size, glow_col + (0,))
        glow_img.putalpha(alpha)
        img.paste(glow_img, (0, 0), glow_img)
    d = ImageDraw.Draw(img)
    cx = x
    for i, ch in enumerate(text):
        d.text((cx, y), ch, font=font, fill=mix(c1, c2, i / n))
        cx += d.textlength(ch, font=font)


def add_noise(img, amount=0.045):
    if not HAS_CV:
        return
    a = np.asarray(img).astype(np.int16)
    noise = np.random.normal(0, 255 * amount, a.shape).astype(np.int16)
    np.clip(a + noise, 0, 255, out=a)
    img.paste(Image.fromarray(a.astype(np.uint8), "RGB"))


def parse_catalog(path):
    src = open(path, encoding="utf-8").read()
    games = []
    for m in re.finditer(r"id:\s*'([^']+)'", src):
        gid = m.group(1)
        chunk = src[m.start():m.start() + 900]

        def pair(key):
            mm = re.search(key + r":\s*\{\s*zh:\s*'((?:[^'\\]|\\.)*)'\s*,\s*en:\s*'((?:[^'\\]|\\.)*)'", chunk)
            return (mm.group(1), mm.group(2)) if mm else ("", "")

        name, desc, genre = pair("name"), pair("desc"), pair("genre")
        hue = re.search(r"hue:\s*'(#[0-9a-fA-F]{6})'", chunk)
        dur = re.search(r"duration:\s*'([^']*)'", chunk)
        plays = re.search(r"plays:\s*(\d+)", chunk)
        games.append({
            "id": gid, "zh": name[0], "en": name[1],
            "desc": desc[0], "genre": genre[0],
            "hue": hex2rgb(hue.group(1)) if hue else CYAN,
            "duration": dur.group(1) if dur else "",
            "plays": int(plays.group(1)) if plays else 0,
            "hot": bool(re.search(r"hot:\s*true", chunk)),
            "isNew": bool(re.search(r"isNew:\s*true", chunk)),
        })
    return games


def wrap(draw, text, font, max_w, max_lines=3):
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=font) > max_w and cur:
            lines.append(cur)
            cur = ch
            if len(lines) == max_lines:
                break
        else:
            cur += ch
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and lines[-1] and draw.textlength(text, font=font) > max_w * max_lines:
        lines[-1] = lines[-1][:-1] + "…"
    return lines


def kind_of(gid):
    g = gid.lower()
    for key, kind in [("mario", "mario"), ("adventure", "mario"), ("shoot", "shooter"), ("plane", "shooter"),
                      ("break", "breakout"), ("brick", "breakout"), ("snake", "snake"), ("tetris", "tetris"),
                      ("2048", "2048"), ("pinball", "breakout"), ("mole", "snake"), ("chess", "tetris"),
                      ("pong", "breakout"), ("gomoku", "tetris"), ("ttt", "tetris")]:
        if key in g:
            return kind
    return "pad"


def draw_icon(kind, size, color):
    tile = rounded_gradient((size, size), int(size * 0.24), mix(color, (16, 24, 48), 0.5), color)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(tile)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    u = size / 100.0
    dark = mix(color, (16, 24, 48), 0.5)

    if kind == "mario":
        d.rounded_rectangle([cx - 20 * u, cy - 2 * u, cx + 20 * u, cy + 24 * u], radius=8 * u, fill=WHITE)
        d.ellipse([cx - 30 * u, cy - 40 * u, cx + 30 * u, cy + 6 * u], fill=WHITE)
        d.ellipse([cx - 16 * u, cy - 30 * u, cx - 4 * u, cy - 18 * u], fill=dark)
        d.ellipse([cx + 4 * u, cy - 30 * u, cx + 16 * u, cy - 18 * u], fill=dark)
    elif kind == "shooter":
        d.polygon([(cx, cy - 34 * u), (cx + 22 * u, cy + 26 * u), (cx, cy + 12 * u), (cx - 22 * u, cy + 26 * u)], fill=WHITE)
        d.polygon([(cx - 34 * u, cy - 6 * u), (cx - 10 * u, cy + 2 * u), (cx - 34 * u, cy + 14 * u)], fill=WHITE)
        d.polygon([(cx + 34 * u, cy - 6 * u), (cx + 10 * u, cy + 2 * u), (cx + 34 * u, cy + 14 * u)], fill=WHITE)
        d.rectangle([cx - 3 * u, cy - 40 * u, cx + 3 * u, cy - 26 * u], fill=WHITE)
    elif kind == "breakout":
        for i in range(4):
            d.rectangle([cx - 32 * u + i * 17 * u, cy - 34 * u, cx - 20 * u + i * 17 * u, cy - 22 * u], fill=WHITE)
        d.ellipse([cx - 7 * u, cy - 8 * u, cx + 7 * u, cy + 6 * u], fill=WHITE)
        d.rounded_rectangle([cx - 26 * u, cy + 22 * u, cx + 26 * u, cy + 32 * u], radius=5 * u, fill=WHITE)
    elif kind == "snake":
        pts = [(cx + 26 * u, cy + 24 * u), (cx + 8 * u, cy + 24 * u), (cx + 8 * u, cy + 2 * u),
               (cx - 14 * u, cy + 2 * u), (cx - 14 * u, cy - 18 * u)]
        for i, p in enumerate(pts):
            r = (11 - i * 1.2) * u
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=WHITE)
        d.ellipse([cx - 26 * u, cy - 32 * u, cx - 14 * u, cy - 20 * u], fill=WHITE)
    elif kind == "tetris":
        s, g = 15 * u, 1.5 * u
        for r, c in [(0, 0), (0, 1), (0, 2), (1, 2)]:
            x0 = cx - 30 * u + c * (s + g)
            y0 = cy - 24 * u + r * (s + g)
            d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=3 * u, fill=WHITE)
    elif kind == "2048":
        d.rounded_rectangle([cx - 32 * u, cy - 32 * u, cx + 32 * u, cy + 32 * u], radius=8 * u, fill=WHITE)
        d.text((cx, cy), "2048", font=f("msyhbd.ttc", int(size * 0.24)), fill=(20, 30, 60), anchor="mm")
    else:
        d.rounded_rectangle([cx - 34 * u, cy - 20 * u, cx + 34 * u, cy + 22 * u], radius=14 * u, fill=WHITE)
        d.ellipse([cx - 24 * u, cy - 8 * u, cx - 8 * u, cy + 8 * u], fill=dark)
        d.rectangle([cx - 12 * u, cy - 3 * u, cx + 4 * u, cy + 3 * u], fill=dark)
        d.ellipse([cx + 8 * u, cy - 8 * u, cx + 16 * u, cy], fill=dark)
        d.ellipse([cx + 20 * u, cy - 8 * u, cx + 28 * u, cy], fill=dark)
    return img


def qr_image(url, target, dots=True):
    """Styled QR: rounded dots for data modules, solid squares for finder patterns."""
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=1, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)
    scale = max(1, target // n)
    size = n * scale
    img = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(img)
    for r in range(n):
        for c in range(n):
            if not m[r][c]:
                continue
            x, y = c * scale, r * scale
            col = mix((10, 16, 38), (72, 46, 140), r / n)
            finder = (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)
            if finder or not dots:
                d.rectangle([x, y, x + scale - 1, y + scale - 1], fill=col)
            else:
                pad = scale * 0.06
                d.ellipse([x + pad, y + pad, x + scale - pad, y + scale - pad], fill=col)
    return img


def qr_ok(img, url):
    if not HAS_CV:
        return True
    t, _, _ = cv2.QRCodeDetector().detectAndDecode(
        cv2.cvtColor(np.asarray(img.convert("RGB")), cv2.COLOR_RGB2BGR))
    return t == url


def fmt_plays(n):
    if n >= 10000:
        return "%.1f 万人在玩" % (n / 10000.0)
    if n > 0:
        return "%d 人在玩" % n
    return "新品上线"


def poster(game):
    random.seed(sum(ord(c) for c in game["id"]))
    color = game["hue"]
    img = Image.new("RGB", (W, H), (6, 10, 20))
    d0 = ImageDraw.Draw(img)
    for y in range(H):
        d0.line([(0, y), (W, y)], fill=mix((7, 11, 22), (13, 19, 42), y / H))

    for x, y, s, c, a in [(-220, -280, 980, color, 0.45), (720, 720, 1050, VIOLET, 0.36), (-180, 1180, 900, CYAN, 0.24)]:
        layer = glow(s, c, a)
        img.paste(layer, (x, y), layer)

    d = ImageDraw.Draw(img, "RGBA")
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 7))
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 7))
    for _ in range(200):
        x, y = random.randint(0, W), random.randint(0, H)
        r = random.choice([1, 1, 2])
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, random.randint(28, 115)))

    # ---------- brand row ----------
    logo = rounded_gradient((54, 54), 16, CYAN, VIOLET)
    img.paste(logo, (M, 62), logo)
    d.text((M + 27, 89), "S", font=f("msyhbd.ttc", 30), fill=WHITE, anchor="mm")
    d.text((M + 74, 58), "星潮互动", font=f("msyhbd.ttc", 30), fill=TEXT)
    d.text((M + 76, 98), "STARTIDE INTERACTIVE", font=f("msyh.ttc", 15), fill=(172, 192, 222))
    d.text((W - M, 72), "扫码即玩 · 免下载", font=f("msyh.ttc", 22), fill=(208, 224, 248), anchor="ra")
    d.text((W - M, 104), "全端可玩 · 每天上新", font=f("msyh.ttc", 18), fill=MUTED, anchor="ra")

    # ---------- cover card ----------
    cx0, cy0, cs = M, 160, 420
    shadow(d, [cx0, cy0, cx0 + cs, cy0 + cs], 30)
    d.rounded_rectangle([cx0, cy0, cx0 + cs, cy0 + cs], radius=30, fill=(255, 255, 255, 14))
    d.rounded_rectangle([cx0, cy0, cx0 + cs, cy0 + cs], radius=30, outline=(255, 255, 255, 46), width=2)
    # diagonal highlight
    d.polygon([(cx0 + cs, cy0), (cx0 + cs, cy0 + 190), (cx0 + 40, cy0 + cs), (cx0 + cs, cy0 + cs)],
              fill=(255, 255, 255, 12))
    icon = draw_icon(kind_of(game["id"]), 250, color)
    icon_x, icon_y = cx0 + (cs - 250) // 2, cy0 + 46
    img.paste(icon, (icon_x, icon_y), icon)
    # soft reflection, clipped inside the card
    refl = icon.transpose(Image.FLIP_TOP_BOTTOM).crop((0, 250 - 56, 250, 250))
    rmask = Image.linear_gradient("L").resize((250, 56)).transpose(Image.FLIP_TOP_BOTTOM)
    refl.putalpha(rmask.point(lambda v: int(v * 0.18)))
    img.paste(refl, (icon_x, icon_y + 250 + 6), refl)

    # ---------- title block ----------
    tx = M + cs + 46
    bx = tx
    fm, fs = f("msyhbd.ttc", 18), f("msyh.ttc", 17)
    badges = []
    if game["isNew"]:
        badges.append(("NEW", "新品", PINK))
    if game["hot"]:
        badges.append(("HOT", "热门", (255, 176, 32)))
    badges.append((game["genre"] or "经典玩法", "", color))
    for main, sub, bg in badges:
        pad = 16
        if sub:
            w = d.textlength(main, font=fm) + d.textlength(sub, font=fs) + pad * 2 + 10
        else:
            w = d.textlength(main, font=fm) + pad * 2
        d.rounded_rectangle([bx, 178, bx + w, 214], radius=18, fill=bg + (58,))
        d.rounded_rectangle([bx, 178, bx + w, 214], radius=18, outline=bg + (200,), width=1)
        if sub:
            d.text((bx + pad, 196), main, font=fm, fill=WHITE, anchor="lm")
            d.text((bx + w - pad, 196), sub, font=fs, fill=(255, 255, 255, 215), anchor="rm")
        else:
            d.text((bx + w / 2, 196), main, font=fm, fill=WHITE, anchor="mm")
        bx += w + 12

    gradient_text(img, (tx, 236), game["zh"], f("msyhbd.ttc", 66), WHITE, mix(color, WHITE, 0.35), glow_col=color)
    d.text((tx + 2, 330), game["en"], font=f("msyh.ttc", 25), fill=MUTED)

    body = f("msyh.ttc", 27)
    for i, line in enumerate(wrap(d, game["desc"], body, W - M - tx, 3)):
        d.text((tx, 386 + i * 44), line, font=body, fill=(190, 205, 230))

    # stats
    sy = 540
    for label in [game["genre"] or "经典玩法", "单局 " + game["duration"] if game["duration"] else "碎片时间", fmt_plays(game["plays"])]:
        w = d.textlength(label, font=f("msyh.ttc", 22)) + 40
        d.rounded_rectangle([tx, sy, tx + w, sy + 46], radius=23, fill=(255, 255, 255, 12))
        d.rounded_rectangle([tx, sy, tx + w, sy + 46], radius=23, outline=(255, 255, 255, 34), width=1)
        d.text((tx + w / 2, sy + 23), label, font=f("msyh.ttc", 22), fill=(210, 226, 250), anchor="mm")
        tx += w + 14

    # ---------- QR card ----------
    url = SITE + "play.html?g=" + game["id"]
    qr = qr_image(url, 360)
    if not qr_ok(qr, url):
        qr = qr_image(url, 360, dots=False)
    qs = qr.size[0]
    qy, qh = 660, 470
    shadow(d, [M, qy, W - M, qy + qh], 32)
    d.rounded_rectangle([M, qy, W - M, qy + qh], radius=32, fill=CARD)
    # top gradient strip
    strip = rounded_gradient((W - 2 * M - 56, 8), 4, CYAN, PINK)
    img.paste(strip, (M + 28, qy + 6), strip)
    d.rounded_rectangle([M, qy + 8, W - M, qy + qh], radius=32, fill=CARD)
    d.rounded_rectangle([M, qy, W - M, qy + qh], radius=32, outline=(255, 255, 255, 120), width=1)

    qx = W - M - 46 - qs
    qy_qr = qy + (qh - qs) // 2 + 6
    img.paste(qr, (qx, qy_qr))
    qr.save(os.path.join(QR_DIR, game["id"] + ".png"))

    bs = 80
    badge = rounded_gradient((bs, bs), 22, CYAN, VIOLET)
    bx2 = qx + (qs - bs) // 2
    by2 = qy_qr + (qs - bs) // 2
    frame = Image.new("RGB", (bs + 14, bs + 14), CARD)
    frame.paste(badge, (7, 7), badge)
    img.paste(frame, (bx2 - 7, by2 - 7))
    d.text((bx2 + bs / 2, by2 + bs / 2), "S", font=f("msyhbd.ttc", 44), fill=WHITE, anchor="mm")

    ix = M + 46
    d.text((ix, qy + 56), "扫码，直接玩这一款", font=f("msyhbd.ttc", 44), fill=(10, 16, 30))
    d.text((ix, qy + 130), "打开相机扫一扫，秒进《%s》" % game["zh"], font=f("msyh.ttc", 23), fill=(92, 106, 130))
    mono = f("consola.ttf", 20)
    d.text((ix, qy + 184), "https://siinaiiovalle-droid.github.io/", font=mono, fill=(22, 108, 196))
    d.text((ix, qy + 214), "startide-arcade/play.html?g=" + game["id"], font=mono, fill=(22, 108, 196))
    for i, t in enumerate(["· 免安装，点开即玩", "· 成绩自动进排行榜", "· 手机 · 平板 · 电脑全端可玩"]):
        d.text((ix, qy + 270 + i * 40), t, font=f("msyh.ttc", 22), fill=(72, 88, 115))

    # ---------- footer ----------
    fy = qy + qh + 52
    d.line([(M, fy), (W - M, fy)], fill=(255, 255, 255, 30), width=2)
    d.text((M, fy + 38), "星潮互动 STARTIDE INTERACTIVE", font=f("msyhbd.ttc", 26), fill=TEXT)
    d.text((W - M, fy + 40), "60+ games · play instantly", font=f("msyh.ttc", 20), fill=MUTED, anchor="ra")
    d.text((M, fy + 92), "Play instantly. No download. Any device — anywhere in the world.",
           font=f("msyh.ttc", 21), fill=(125, 145, 180))

    out = img
    os.makedirs(OUT_DIR, exist_ok=True)
    out.save(os.path.join(OUT_DIR, game["id"] + ".png"), "PNG", optimize=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(QR_DIR, exist_ok=True)
    games = parse_catalog(CATALOG)
    only = set(sys.argv[1:])
    made = 0
    for g in games:
        if only and g["id"] not in only:
            continue
        poster(g)
        made += 1
    print("done:", made, "posters")


if __name__ == "__main__":
    main()
