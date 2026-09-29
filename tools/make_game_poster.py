# -*- coding: utf-8 -*-
"""Generate one poster per game, each with a QR code that opens that game directly.

Reads game metadata from assets/js/games/catalog.js and writes:
  assets/img/posters/<id>.png    1200 x 1600 poster
  assets/img/qr/<id>.png         plain QR code for that game

Usage:
  python tools/make_game_poster.py              # all games
  python tools/make_game_poster.py mario snake  # only these ids
"""
import os
import re
import sys
import random
from PIL import Image, ImageDraw, ImageFont
import qrcode

W, H = 1200, 1380
M = 72
SITE = "https://siinaiiovalle-droid.github.io/startide-arcade/"
CATALOG = os.path.join("assets", "js", "games", "catalog.js")
OUT_DIR = os.path.join("assets", "img", "posters")
QR_DIR = os.path.join("assets", "img", "qr")

CYAN = (56, 225, 255)
VIOLET = (122, 92, 255)
WHITE = (255, 255, 255)
TEXT = (233, 239, 252)
MUTED = (150, 170, 205)

FONT_DIR = "C:/Windows/Fonts/"


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


def glow(w, h, color, strength):
    layer = Image.new("RGBA", (w, h), color + (0,))
    mask = Image.radial_gradient("L").resize((w, h), Image.LANCZOS)
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


def parse_catalog(path):
    src = open(path, encoding="utf-8").read()
    games = []
    for m in re.finditer(r"id:\s*'([^']+)'", src):
        gid = m.group(1)
        start = m.start()
        chunk = src[start:start + 900]

        def pair(key):
            mm = re.search(key + r":\s*\{\s*zh:\s*'((?:[^'\\]|\\.)*)'\s*,\s*en:\s*'((?:[^'\\]|\\.)*)'", chunk)
            return (mm.group(1), mm.group(2)) if mm else ("", "")

        name = pair("name")
        desc = pair("desc")
        genre = pair("genre")
        hue = re.search(r"hue:\s*'(#[0-9a-fA-F]{6})'", chunk)
        dur = re.search(r"duration:\s*'([^']*)'", chunk)
        games.append({
            "id": gid,
            "zh": name[0], "en": name[1],
            "desc": desc[0], "desc_en": desc[1],
            "genre": genre[0], "genre_en": genre[1],
            "hue": hex2rgb(hue.group(1)) if hue else CYAN,
            "duration": dur.group(1) if dur else "",
        })
    return games


def wrap(draw, text, font, max_w):
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=font) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def kind_of(gid):
    g = gid.lower()
    for key, kind in [("mario", "mario"), ("adventure", "mario"), ("shoot", "shooter"), ("plane", "shooter"),
                      ("break", "breakout"), ("brick", "breakout"), ("snake", "snake"),
                      ("tetris", "tetris"), ("2048", "2048"), ("pinball", "breakout"),
                      ("mole", "snake"), ("chess", "tetris"), ("pong", "breakout")]:
        if key in g:
            return kind
    return "pad"


def draw_icon(kind, size, color):
    tile = rounded_gradient((size, size), int(size * 0.24), mix(color, (20, 30, 60), 0.45), color)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(tile)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    u = size / 100.0

    if kind == "mario":
        d.rounded_rectangle([cx - 20 * u, cy - 2 * u, cx + 20 * u, cy + 24 * u], radius=8 * u, fill=WHITE)
        d.ellipse([cx - 30 * u, cy - 40 * u, cx + 30 * u, cy + 6 * u], fill=WHITE)
        d.ellipse([cx - 16 * u, cy - 30 * u, cx - 4 * u, cy - 18 * u], fill=mix(color, (20, 30, 60), 0.45))
        d.ellipse([cx + 4 * u, cy - 30 * u, cx + 16 * u, cy - 18 * u], fill=mix(color, (20, 30, 60), 0.45))
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
    else:  # gamepad
        d.rounded_rectangle([cx - 34 * u, cy - 20 * u, cx + 34 * u, cy + 22 * u], radius=14 * u, fill=WHITE)
        d.ellipse([cx - 24 * u, cy - 8 * u, cx - 8 * u, cy + 8 * u], fill=mix(color, (20, 30, 60), 0.45))
        d.rectangle([cx - 12 * u, cy - 3 * u, cx + 4 * u, cy + 3 * u], fill=mix(color, (20, 30, 60), 0.45))
        d.ellipse([cx + 8 * u, cy - 8 * u, cx + 16 * u, cy], fill=mix(color, (20, 30, 60), 0.45))
        d.ellipse([cx + 20 * u, cy - 8 * u, cx + 28 * u, cy], fill=mix(color, (20, 30, 60), 0.45))
    return img


def make_qr(url, max_px):
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=1, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    im = qr.make_image(fill_color=(8, 13, 26), back_color="white").convert("RGB")
    w, _ = im.size
    k = max(1, max_px // w)
    return im.resize((w * k, w * k), Image.NEAREST)


def poster(game):
    random.seed(sum(ord(c) for c in game["id"]))
    color = game["hue"]
    img = Image.new("RGB", (W, H), (6, 10, 20))
    d0 = ImageDraw.Draw(img)
    for y in range(H):
        d0.line([(0, y), (W, y)], fill=mix((6, 10, 20), (12, 18, 40), y / H))

    for x, y, s, c, a in [(-200, -260, 900, color, 0.42), (700, 700, 1000, VIOLET, 0.34), (-160, 1150, 850, CYAN, 0.24)]:
        layer = glow(s, s, c, a)
        img.paste(layer, (x, y), layer)

    d = ImageDraw.Draw(img, "RGBA")
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 8))
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 8))
    for _ in range(180):
        x, y = random.randint(0, W), random.randint(0, H)
        r = random.choice([1, 1, 2])
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, random.randint(30, 120)))

    # header
    logo = rounded_gradient((64, 64), 18, CYAN, VIOLET)
    img.paste(logo, (M, 64), logo)
    d.text((M + 32, 96), "S", font=f("msyhbd.ttc", 34), fill=WHITE, anchor="mm")
    d.text((M + 86, 68), "星潮互动", font=f("msyhbd.ttc", 30), fill=TEXT)
    d.text((M + 88, 106), "STARTIDE INTERACTIVE", font=f("msyh.ttc", 16), fill=MUTED)
    d.text((W - M, 96), "扫码即玩 · 免下载", font=f("msyh.ttc", 22), fill=MUTED, anchor="ra")
    d.line([(M, 152), (W - M, 152)], fill=(255, 255, 255, 26), width=2)

    # icon + title
    icon = draw_icon(kind_of(game["id"]), 190, color)
    img.paste(icon, (M, 200), icon)
    tx = M + 232
    d.text((tx, 208), game["zh"], font=f("msyhbd.ttc", 62), fill=TEXT)
    d.text((tx + 2, 292), game["en"], font=f("msyh.ttc", 26), fill=MUTED)

    # pills
    px, py = tx, 346
    for label in [g for g in [game["genre"], "单局 " + game["duration"] if game["duration"] else "", "全端可玩"] if g]:
        w = d.textlength(label, font=f("msyh.ttc", 22)) + 36
        d.rounded_rectangle([px, py, px + w, py + 44], radius=22, outline=color + (110,), width=2)
        d.text((px + w / 2, py + 22), label, font=f("msyh.ttc", 22), fill=(205, 225, 255), anchor="mm")
        px += w + 14

    # description
    d.text((M, 452), "玩法", font=f("msyhbd.ttc", 30), fill=TEXT)
    body = f("msyh.ttc", 27)
    for i, line in enumerate(wrap(d, game["desc"], body, W - 2 * M)):
        d.text((M, 508 + i * 46), line, font=body, fill=(185, 200, 224))

    d.line([(M, 690), (W - M, 690)], fill=(255, 255, 255, 26), width=2)

    # QR card
    url = SITE + "play.html?g=" + game["id"]
    qr = make_qr(url, 320)
    qs = qr.size[0]
    qy = 714
    qh = 420
    d.rounded_rectangle([M, qy, W - M, qy + qh], radius=28, fill=(245, 248, 255))
    qx = W - M - 48 - qs
    qy_qr = qy + (qh - qs) // 2
    img.paste(qr, (qx, qy_qr))
    qr.save(os.path.join(QR_DIR, game["id"] + ".png"))

    bs = 78
    badge = rounded_gradient((bs, bs), 22, CYAN, VIOLET)
    bx = qx + (qs - bs) // 2
    by = qy_qr + (qs - bs) // 2
    frame = Image.new("RGB", (bs + 14, bs + 14), (245, 248, 255))
    frame.paste(badge, (7, 7), badge)
    img.paste(frame, (bx - 7, by - 7))
    d.text((bx + bs / 2, by + bs / 2), "S", font=f("msyhbd.ttc", 44), fill=WHITE, anchor="mm")

    tx2 = M + 44
    d.text((tx2, qy + 54), "扫码直接玩这款", font=f("msyhbd.ttc", 44), fill=(10, 16, 30))
    d.text((tx2, qy + 122), "打开相机扫一扫，直接进入《%s》" % game["zh"], font=f("msyh.ttc", 23), fill=(90, 105, 130))
    mono = f("consola.ttf", 20)
    d.text((tx2, qy + 172), "https://siinaiiovalle-droid.github.io/", font=mono, fill=(20, 110, 200))
    d.text((tx2, qy + 202), "startide-arcade/play.html?g=" + game["id"], font=mono, fill=(20, 110, 200))
    d.text((tx2, qy + 258), "· 免安装，点开即玩", font=f("msyh.ttc", 22), fill=(70, 88, 115))
    d.text((tx2, qy + 298), "· 成绩自动进排行榜", font=f("msyh.ttc", 22), fill=(70, 88, 115))
    d.text((tx2, qy + 338), "· 手机 · 平板 · 电脑全端可玩", font=f("msyh.ttc", 22), fill=(70, 88, 115))

    # footer
    fy = qy + qh + 54
    d.line([(M, fy), (W - M, fy)], fill=(255, 255, 255, 26), width=2)
    d.text((M, fy + 40), "星潮互动 STARTIDE INTERACTIVE", font=f("msyhbd.ttc", 26), fill=TEXT)
    d.text((W - M, fy + 42), "60+ games · play instantly", font=f("msyh.ttc", 20), fill=MUTED, anchor="ra")
    d.text((M, fy + 96), "Play instantly. No download. Any device — anywhere in the world.",
           font=f("msyh.ttc", 21), fill=(125, 145, 180))

    out = os.path.join(OUT_DIR, game["id"] + ".png")
    img.save(out, "PNG", optimize=True)
    print("poster:", out, "qr:", url)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(QR_DIR, exist_ok=True)
    games = parse_catalog(CATALOG)
    only = set(sys.argv[1:])
    for g in games:
        if only and g["id"] not in only:
            continue
        poster(g)
    print("done:", len([g for g in games if not only or g["id"] in only]), "posters")


if __name__ == "__main__":
    main()
