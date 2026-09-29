# -*- coding: utf-8 -*-
"""Cartoon sprite library for game posters (pure PIL, no assets).

sprite(kind, size, color) -> RGBA image, transparent background.
kind_of(game_id)          -> best matching sprite kind.
"""
import math
from PIL import Image, ImageDraw

KIND_HINTS = [
    ("mushroom", ["mario", "adventure", "jump"]),
    ("ship", ["shoot", "plane", "raider", "space"]),
    ("brickbot", ["break", "brick", "pinball", "pong"]),
    ("worm", ["snake"]),
    ("block", ["tetris", "klotski", "stack", "fifteen"]),
    ("number", ["2048", "sudoku", "guessnum"]),
    ("mole", ["whack", "mole"]),
    ("bird", ["flappy", "bird"]),
    ("dino", ["dino"]),
    ("fish", ["fishing", "fish"]),
    ("watermelon", ["suika", "fruit", "melon"]),
    ("balloon", ["balloon"]),
    ("bubble", ["bubble", "shooter2"]),
    ("tank", ["tank"]),
    ("bomb", ["minesweeper", "mine", "bomb"]),
    ("cards", ["freecell", "memory", "link", "slot", "solitaire"]),
    ("dice", ["rich", "dice"]),
    ("target", ["archery", "towerdef", "tower", "bowling"]),
    ("car", ["racer", "car"]),
    ("heli", ["helicopter", "heli"]),
    ("gem", ["gem", "jewel"]),
    ("piece", ["puzzle", "spotdiff", "spotdif"]),
    ("duck", ["duck"]),
    ("sumo", ["sumo"]),
    ("lightning", ["reflex"]),
    ("goban", ["gomoku", "ttt", "chess", "go"]),
]


def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def kind_of(gid):
    g = (gid or "").lower()
    for kind, keys in KIND_HINTS:
        for k in keys:
            if k in g:
                return kind
    return "pad"


def sprite(kind, size, color):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = size / 100.0
    dark = mix(color, (10, 16, 34), 0.42)
    light = mix(color, (255, 255, 255), 0.42)
    w = max(2, int(2.6 * u))
    cx = cy = 50 * u

    def eyes(ey=44, gap=13, r=6.5):
        if r <= 0:
            return
        for s in (-1, 1):
            x = cx + s * gap * u
            y = ey * u
            d.ellipse([x - r * u, y - r * 1.2 * u, x + r * u, y + r * 1.2 * u],
                      fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
            d.ellipse([x - 2.1 * u, y - 2.1 * u, x + 2.4 * u, y + 2.4 * u], fill=(24, 30, 50, 255))
            d.ellipse([x - 1.6 * u, y - 2.9 * u, x - 0.1 * u, y - 1.4 * u], fill=(255, 255, 255, 255))

    def blush(ey=54, gap=22, r=6):
        for s in (-1, 1):
            x = cx + s * gap * u
            d.ellipse([x - r * u, ey * u - r * 0.6 * u, x + r * u, ey * u + r * 0.6 * u], fill=(255, 110, 150, 120))

    def smile(ey=56, r=7):
        d.arc([cx - r * u, ey * u - r * 0.6 * u, cx + r * u, ey * u + r * 0.9 * u],
              15, 165, fill=dark, width=max(1, int(2 * u)))

    if kind == "mushroom":
        d.rounded_rectangle([cx - 26 * u, cy - 2 * u, cx + 26 * u, cy + 34 * u], radius=12 * u,
                            fill=light, outline=dark, width=w)
        d.ellipse([cx - 40 * u, cy - 46 * u, cx + 40 * u, cy + 6 * u], fill=color, outline=dark, width=w)
        for s in (-1, 1):
            d.ellipse([cx + s * 31 * u - 8 * u, cy - 32 * u, cx + s * 31 * u + 8 * u, cy - 16 * u], fill=(255, 255, 255, 235))
        eyes(ey=20, gap=15, r=7)
        blush(ey=32, gap=30)
        smile(ey=34, r=8)
    elif kind == "ship":
        d.polygon([(cx, cy - 44 * u), (cx + 30 * u, cy + 30 * u), (cx, cy + 16 * u), (cx - 30 * u, cy + 30 * u)],
                  fill=color, outline=dark, width=w)
        d.polygon([(cx - 40 * u, cy - 4 * u), (cx - 12 * u, cy + 6 * u), (cx - 40 * u, cy + 18 * u)],
                  fill=light, outline=dark, width=w)
        d.polygon([(cx + 40 * u, cy - 4 * u), (cx + 12 * u, cy + 6 * u), (cx + 40 * u, cy + 18 * u)],
                  fill=light, outline=dark, width=w)
        d.ellipse([cx - 12 * u, cy - 26 * u, cx + 12 * u, cy - 2 * u], fill=(150, 235, 255, 255), outline=dark, width=w)
        d.ellipse([cx - 7 * u, cy - 22 * u, cx - 1 * u, cy - 16 * u], fill=(255, 255, 255, 255))
        d.polygon([(cx - 9 * u, cy + 30 * u), (cx + 9 * u, cy + 30 * u), (cx, cy + 46 * u)], fill=(255, 176, 60, 250))
    elif kind == "brickbot":
        d.rounded_rectangle([cx - 38 * u, cy - 36 * u, cx + 38 * u, cy + 34 * u], radius=12 * u,
                            fill=color, outline=dark, width=w)
        for i in range(3):
            y0 = cy - 30 * u + i * 20 * u
            d.line([(cx - 38 * u, y0), (cx + 38 * u, y0)], fill=dark, width=max(1, int(1.6 * u)))
        d.line([(cx, cy - 36 * u), (cx, cy - 12 * u)], fill=dark, width=max(1, int(1.6 * u)))
        d.line([(cx - 19 * u, cy - 12 * u), (cx - 19 * u, cy + 8 * u)], fill=dark, width=max(1, int(1.6 * u)))
        d.line([(cx + 19 * u, cy - 12 * u), (cx + 19 * u, cy + 8 * u)], fill=dark, width=max(1, int(1.6 * u)))
        eyes(ey=-4, gap=15, r=8)
        smile(ey=12, r=8)
        d.rounded_rectangle([cx - 30 * u, cy + 38 * u, cx + 30 * u, cy + 46 * u], radius=4 * u, fill=light, outline=dark, width=w)
    elif kind == "worm":
        pts = [(cx + 30 * u, cy + 28 * u), (cx + 14 * u, cy + 32 * u), (cx - 4 * u, cy + 20 * u), (cx - 16 * u, cy + 2 * u)]
        for i, p in enumerate(pts):
            r = (16 - i * 2.2) * u
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color if i % 2 == 0 else light, outline=dark, width=w)
        d.ellipse([cx - 34 * u, cy - 38 * u, cx + 6 * u, cy + 2 * u], fill=color, outline=dark, width=w)
        d.ellipse([cx - 28 * u, cy - 32 * u, cx - 18 * u, cy - 22 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.ellipse([cx - 26 * u, cy - 30 * u, cx - 22 * u, cy - 26 * u], fill=(24, 30, 50, 255))
        d.ellipse([cx - 12 * u, cy - 32 * u, cx - 2 * u, cy - 22 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.ellipse([cx - 10 * u, cy - 30 * u, cx - 6 * u, cy - 26 * u], fill=(24, 30, 50, 255))
        d.line([(cx - 34 * u, cy + 2 * u), (cx - 44 * u, cy + 10 * u)], fill=(255, 90, 120, 255), width=max(1, int(2 * u)))
    elif kind == "block":
        cells = [(cx - 26 * u, cy - 40 * u), (cx + 2 * u, cy - 40 * u), (cx - 26 * u, cy - 12 * u), (cx + 2 * u, cy - 12 * u),
                 (cx - 26 * u, cy + 16 * u)]
        for i, (x0, y0) in enumerate(cells):
            c = color if i % 2 == 0 else light
            d.rounded_rectangle([x0, y0, x0 + 24 * u, y0 + 24 * u], radius=5 * u, fill=c, outline=dark, width=w)
        eyes(ey=-28, gap=14, r=6)
        smile(ey=-10, r=6)
    elif kind == "number":
        d.rounded_rectangle([cx - 40 * u, cy - 40 * u, cx + 40 * u, cy + 40 * u], radius=14 * u,
                            fill=color, outline=dark, width=w)
        d.rounded_rectangle([cx - 32 * u, cy - 32 * u, cx + 32 * u, cy + 6 * u], radius=8 * u, fill=(255, 255, 255, 40))
        d.ellipse([cx - 16 * u, cy - 14 * u, cx - 6 * u, cy - 4 * u], fill=(24, 30, 50, 255))
        d.ellipse([cx + 6 * u, cy - 14 * u, cx + 16 * u, cy - 4 * u], fill=(24, 30, 50, 255))
        d.arc([cx - 12 * u, cy - 2 * u, cx + 12 * u, cy + 16 * u], 10, 170, fill=(24, 30, 50, 255), width=max(1, int(2.4 * u)))
    elif kind == "mole":
        d.ellipse([cx - 38 * u, cy - 34 * u, cx + 38 * u, cy + 40 * u], fill=color, outline=dark, width=w)
        d.ellipse([cx - 24 * u, cy - 22 * u, cx + 24 * u, cy + 10 * u], fill=light)
        eyes(ey=-8, gap=14, r=7)
        blush(ey=8, gap=28, r=7)
        d.ellipse([cx - 9 * u, cy + 6 * u, cx + 9 * u, cy + 18 * u], fill=(255, 120, 150, 230))
        d.rounded_rectangle([cx - 11 * u, cy + 10 * u, cx + 11 * u, cy + 24 * u], radius=3 * u, fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.2 * u)))
        d.line([(cx, cy + 10 * u), (cx, cy + 24 * u)], fill=dark, width=max(1, int(1.2 * u)))
        for s in (-1, 1):
            d.ellipse([cx + s * 34 * u - 10 * u, cy - 44 * u, cx + s * 34 * u + 10 * u, cy - 24 * u], fill=color, outline=dark, width=w)
    elif kind == "bird":
        d.ellipse([cx - 34 * u, cy - 24 * u, cx + 30 * u, cy + 34 * u], fill=color, outline=dark, width=w)
        d.polygon([(cx + 22 * u, cy + 2 * u), (cx + 48 * u, cy + 14 * u), (cx + 20 * u, cy + 22 * u)], fill=light, outline=dark, width=w)
        d.polygon([(cx - 6 * u, cy - 8 * u), (cx + 6 * u, cy - 8 * u), (cx - 24 * u, cy + 6 * u)], fill=light, outline=dark, width=w)
        d.ellipse([cx - 28 * u, cy - 22 * u, cx - 10 * u, cy - 4 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.ellipse([cx - 24 * u, cy - 18 * u, cx - 18 * u, cy - 12 * u], fill=(24, 30, 50, 255))
        d.polygon([(cx - 40 * u, cy + 2 * u), (cx - 22 * u, cy + 6 * u), (cx - 38 * u, cy + 16 * u)], fill=(255, 176, 32, 255), outline=dark, width=max(1, int(1.2 * u)))
    elif kind == "dino":
        d.rounded_rectangle([cx - 34 * u, cy - 10 * u, cx + 30 * u, cy + 36 * u], radius=16 * u, fill=color, outline=dark, width=w)
        d.ellipse([cx - 6 * u, cy - 44 * u, cx + 38 * u, cy - 4 * u], fill=color, outline=dark, width=w)
        d.polygon([(cx + 4 * u, cy - 46 * u), (cx + 20 * u, cy - 46 * u), (cx + 12 * u, cy - 34 * u)], fill=light, outline=dark, width=max(1, int(1.2 * u)))
        d.ellipse([cx + 20 * u, cy - 32 * u, cx + 30 * u, cy - 22 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.ellipse([cx + 23 * u, cy - 29 * u, cx + 27 * u, cy - 25 * u], fill=(24, 30, 50, 255))
        for i in range(3):
            d.polygon([(cx - 30 * u + i * 20 * u, cy - 6 * u), (cx - 22 * u + i * 20 * u, cy - 20 * u), (cx - 14 * u + i * 20 * u, cy - 6 * u)], fill=light, outline=dark, width=max(1, int(1.2 * u)))
        d.polygon([(cx + 20 * u, cy - 4 * u), (cx + 44 * u, cy + 10 * u), (cx + 18 * u, cy + 14 * u)], fill=color, outline=dark, width=w)
        d.rounded_rectangle([cx - 26 * u, cy + 34 * u, cx - 8 * u, cy + 46 * u], radius=5 * u, fill=light, outline=dark, width=w)
        d.rounded_rectangle([cx + 4 * u, cy + 34 * u, cx + 22 * u, cy + 46 * u], radius=5 * u, fill=light, outline=dark, width=w)
    elif kind == "fish":
        d.ellipse([cx - 32 * u, cy - 24 * u, cx + 20 * u, cy + 26 * u], fill=color, outline=dark, width=w)
        d.polygon([(cx + 12 * u, cy), (cx + 46 * u, cy - 20 * u), (cx + 46 * u, cy + 20 * u)], fill=light, outline=dark, width=w)
        d.polygon([(cx - 10 * u, cy - 24 * u), (cx + 8 * u, cy - 44 * u), (cx + 12 * u, cy - 22 * u)], fill=light, outline=dark, width=w)
        d.ellipse([cx - 24 * u, cy - 12 * u, cx - 10 * u, cy + 2 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.ellipse([cx - 21 * u, cy - 9 * u, cx - 15 * u, cy - 3 * u], fill=(24, 30, 50, 255))
        d.arc([cx - 30 * u, cy + 4 * u, cx - 14 * u, cy + 16 * u], 20, 160, fill=dark, width=max(1, int(1.6 * u)))
    elif kind == "watermelon":
        d.ellipse([cx - 42 * u, cy - 40 * u, cx + 42 * u, cy + 40 * u], fill=(46, 200, 120, 255), outline=dark, width=w)
        d.pieslice([cx - 42 * u, cy - 40 * u, cx + 42 * u, cy + 40 * u], 0, 180, fill=(255, 90, 120, 255), outline=dark, width=w)
        d.ellipse([cx - 34 * u, cy - 32 * u, cx + 34 * u, cy + 32 * u], fill=(255, 120, 140, 255))
        d.ellipse([cx - 34 * u, cy - 32 * u, cx + 34 * u, cy + 32 * u], outline=dark, width=max(1, int(1.4 * u)))
        for s in (-1, 1):
            d.ellipse([cx + s * 14 * u - 3 * u, cy - 6 * u, cx + s * 14 * u + 3 * u, cy + 6 * u], fill=(40, 40, 60, 255))
        eyes(ey=-14, gap=14, r=6)
        smile(ey=0, r=7)
    elif kind == "balloon":
        d.ellipse([cx - 28 * u, cy - 44 * u, cx + 28 * u, cy + 8 * u], fill=color, outline=dark, width=w)
        d.polygon([(cx - 8 * u, cy + 6 * u), (cx + 8 * u, cy + 6 * u), (cx, cy + 16 * u)], fill=color, outline=dark, width=w)
        d.line([(cx, cy + 14 * u), (cx + 6 * u, cy + 42 * u)], fill=dark, width=max(1, int(1.6 * u)))
        d.ellipse([cx - 16 * u, cy - 36 * u, cx - 4 * u, cy - 24 * u], fill=(255, 255, 255, 150))
        eyes(ey=-18, gap=12, r=6)
        smile(ey=-4, r=6)
    elif kind == "bubble":
        for (bx0, by0, r0, c) in [(cx - 16, cy - 12, 20, color), (cx + 16, cy + 6, 16, light), (cx - 12, cy + 22, 12, mix(color, (255, 255, 255), 0.6))]:
            d.ellipse([bx0 * u - r0 * u, by0 * u - r0 * u, bx0 * u + r0 * u, by0 * u + r0 * u], fill=c + (235,), outline=dark, width=w)
            d.ellipse([bx0 * u - r0 * 0.55 * u, by0 * u - r0 * 0.6 * u, bx0 * u - r0 * 0.15 * u, by0 * u - r0 * 0.2 * u], fill=(255, 255, 255, 200))
        eyes(ey=-14, gap=12, r=6)
        smile(ey=-2, r=6)
    elif kind == "tank":
        d.rounded_rectangle([cx - 40 * u, cy - 4 * u, cx + 40 * u, cy + 30 * u], radius=8 * u, fill=color, outline=dark, width=w)
        d.rounded_rectangle([cx - 22 * u, cy - 26 * u, cx + 22 * u, cy + 2 * u], radius=10 * u, fill=light, outline=dark, width=w)
        d.line([(cx + 18 * u, cy - 12 * u), (cx + 48 * u, cy - 12 * u)], fill=dark, width=max(2, int(4 * u)))
        for i in range(5):
            d.ellipse([cx - 36 * u + i * 18 * u, cy + 26 * u, cx - 26 * u + i * 18 * u, cy + 38 * u], fill=dark)
        eyes(ey=-14, gap=12, r=5.5)
    elif kind == "bomb":
        d.ellipse([cx - 38 * u, cy - 22 * u, cx + 38 * u, cy + 44 * u], fill=(38, 44, 62, 255), outline=dark, width=w)
        d.ellipse([cx - 26 * u, cy - 16 * u, cx - 12 * u, cy - 2 * u], fill=(255, 255, 255, 120))
        d.rounded_rectangle([cx - 10 * u, cy - 40 * u, cx + 10 * u, cy - 20 * u], radius=5 * u, fill=(70, 78, 100, 255), outline=dark, width=w)
        d.polygon([(cx + 6 * u, cy - 40 * u), (cx + 26 * u, cy - 54 * u), (cx + 18 * u, cy - 34 * u)], fill=(255, 176, 32, 255))
        d.ellipse([cx + 22 * u, cy - 52 * u, cx + 34 * u, cy - 40 * u], fill=(255, 90, 60, 255))
        eyes(ey=6, gap=14, r=7)
        smile(ey=22, r=8)
    elif kind == "cards":
        for i, (dx, dy) in enumerate([(-14, -6), (10, 4)]):
            x0, y0 = cx + dx * u, cy + dy * u
            d.rounded_rectangle([x0 - 22 * u, y0 - 30 * u, x0 + 22 * u, y0 + 30 * u], radius=7 * u,
                                fill=(255, 255, 255, 250) if i else color, outline=dark, width=w)
            if i:
                d.text((x0, y0), "?", fill=(40, 46, 66, 255), anchor="mm")
            else:
                pts = []
                for k in range(10):
                    ang = -math.pi / 2 + k * math.pi / 5
                    rr = (14 if k % 2 == 0 else 6) * u
                    pts.append((x0 + rr * math.cos(ang), y0 + rr * math.sin(ang)))
                d.polygon(pts, fill=(255, 255, 255, 250))
    elif kind == "dice":
        d.rounded_rectangle([cx - 36 * u, cy - 36 * u, cx + 36 * u, cy + 36 * u], radius=12 * u, fill=(255, 255, 255, 252), outline=dark, width=w)
        for (px, py) in [(-18, -18), (18, -18), (0, 0), (-18, 18), (18, 18)]:
            d.ellipse([cx + px * u - 6 * u, cy + py * u - 6 * u, cx + px * u + 6 * u, cy + py * u + 6 * u], fill=color)
        eyes(ey=-46, gap=0, r=0)
    elif kind == "target":
        for i, c in enumerate([(255, 255, 255, 250), color, (255, 255, 255, 250), color]):
            r = (40 - i * 10) * u
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c, outline=dark if i == 0 else None, width=w if i == 0 else 0)
        d.polygon([(cx + 30 * u, cy - 38 * u), (cx + 44 * u, cy - 24 * u), (cx + 20 * u, cy + 2 * u)], fill=(255, 176, 32, 255), outline=dark, width=max(1, int(1.2 * u)))
    elif kind == "car":
        d.rounded_rectangle([cx - 42 * u, cy - 6 * u, cx + 42 * u, cy + 26 * u], radius=12 * u, fill=color, outline=dark, width=w)
        d.rounded_rectangle([cx - 22 * u, cy - 26 * u, cx + 18 * u, cy - 4 * u], radius=10 * u, fill=light, outline=dark, width=w)
        d.ellipse([cx - 4 * u, cy - 22 * u, cx + 12 * u, cy - 6 * u], fill=(150, 235, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        for s in (-1, 1):
            d.ellipse([cx + s * 26 * u - 12 * u, cy + 18 * u, cx + s * 26 * u + 12 * u, cy + 42 * u], fill=(34, 40, 58, 255), outline=dark, width=w)
            d.ellipse([cx + s * 26 * u - 5 * u, cy + 25 * u, cx + s * 26 * u + 5 * u, cy + 35 * u], fill=(150, 165, 195, 255))
    elif kind == "heli":
        d.ellipse([cx - 34 * u, cy - 18 * u, cx + 22 * u, cy + 22 * u], fill=color, outline=dark, width=w)
        d.ellipse([cx + 8 * u, cy - 12 * u, cx + 26 * u, cy + 6 * u], fill=(150, 235, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.line([(cx - 10 * u, cy - 18 * u), (cx - 10 * u, cy - 44 * u)], fill=dark, width=max(2, int(3 * u)))
        d.line([(cx - 44 * u, cy - 40 * u), (cx + 26 * u, cy - 40 * u)], fill=dark, width=max(2, int(3.4 * u)))
        d.rounded_rectangle([cx - 30 * u, cy + 20 * u, cx + 14 * u, cy + 28 * u], radius=4 * u, fill=light, outline=dark, width=w)
        d.arc([cx - 4 * u, cy - 8 * u, cx + 20 * u, cy + 16 * u], 300, 120, fill=dark, width=max(1, int(1.6 * u)))
    elif kind == "gem":
        d.polygon([(cx - 34 * u, cy - 12 * u), (cx - 14 * u, cy - 40 * u), (cx + 14 * u, cy - 40 * u), (cx + 34 * u, cy - 12 * u),
                   (cx, cy + 42 * u)], fill=color, outline=dark, width=w)
        d.polygon([(cx - 14 * u, cy - 40 * u), (cx + 14 * u, cy - 40 * u), (cx + 4 * u, cy - 12 * u), (cx - 4 * u, cy - 12 * u)], fill=light)
        d.polygon([(cx - 34 * u, cy - 12 * u), (cx + 34 * u, cy - 12 * u), (cx, cy + 42 * u)], fill=mix(color, (255, 255, 255), 0.15))
        d.line([(cx - 20 * u, cy - 26 * u), (cx - 8 * u, cy + 20 * u)], fill=(255, 255, 255, 170), width=max(1, int(2 * u)))
        eyes(ey=-4, gap=11, r=5.5)
    elif kind == "piece":
        d.rounded_rectangle([cx - 34 * u, cy - 34 * u, cx + 34 * u, cy + 34 * u], radius=10 * u, fill=color, outline=dark, width=w)
        for s in (-1, 1):
            d.ellipse([cx + s * 34 * u - 12 * u, cy - 12 * u, cx + s * 34 * u + 12 * u, cy + 12 * u], fill=color, outline=dark, width=w)
        d.ellipse([cx - 12 * u, cy - 46 * u, cx + 12 * u, cy - 34 * u], fill=(255, 255, 255, 255))
        eyes(ey=-10, gap=13, r=6.5)
        smile(ey=8, r=7)
    elif kind == "pin":
        d.polygon([(cx - 20 * u, cy - 40 * u), (cx + 20 * u, cy - 40 * u), (cx + 26 * u, cy + 10 * u),
                   (cx + 10 * u, cy + 42 * u), (cx - 10 * u, cy + 42 * u), (cx - 26 * u, cy + 10 * u)],
                  fill=(255, 255, 255, 250), outline=dark, width=w)
        d.rectangle([cx - 26 * u, cy - 12 * u, cx + 26 * u, cy + 4 * u], fill=color)
        eyes(ey=-24, gap=11, r=5.5)
        smile(ey=-8, r=5)
    elif kind == "duck":
        d.ellipse([cx - 34 * u, cy - 6 * u, cx + 34 * u, cy + 34 * u], fill=color, outline=dark, width=w)
        d.ellipse([cx - 6 * u, cy - 40 * u, cx + 30 * u, cy - 4 * u], fill=color, outline=dark, width=w)
        d.ellipse([cx + 14 * u, cy - 34 * u, cx + 26 * u, cy - 22 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1.1 * u)))
        d.ellipse([cx + 18 * u, cy - 30 * u, cx + 22 * u, cy - 26 * u], fill=(24, 30, 50, 255))
        d.polygon([(cx + 28 * u, cy - 22 * u), (cx + 48 * u, cy - 14 * u), (cx + 26 * u, cy - 10 * u)], fill=(255, 176, 32, 255), outline=dark, width=max(1, int(1.2 * u)))
        d.ellipse([cx - 16 * u, cy + 24 * u, cx + 8 * u, cy + 40 * u], fill=light, outline=dark, width=w)
    elif kind == "sumo":
        d.rounded_rectangle([cx - 36 * u, cy - 18 * u, cx + 36 * u, cy + 38 * u], radius=18 * u, fill=color, outline=dark, width=w)
        d.ellipse([cx - 22 * u, cy - 44 * u, cx + 22 * u, cy - 2 * u], fill=light, outline=dark, width=w)
        d.rectangle([cx - 22 * u, cy - 2 * u, cx + 22 * u, cy + 4 * u], fill=dark)
        eyes(ey=-28, gap=12, r=6)
        blush(ey=-16, gap=24, r=6)
        d.line([(cx - 36 * u, cy + 4 * u), (cx - 52 * u, cy - 6 * u)], fill=light, width=max(2, int(6 * u)))
        d.line([(cx + 36 * u, cy + 4 * u), (cx + 52 * u, cy - 6 * u)], fill=light, width=max(2, int(6 * u)))
    elif kind == "lightning":
        d.polygon([(cx + 6 * u, cy - 46 * u), (cx - 24 * u, cy + 4 * u), (cx - 2 * u, cy + 4 * u),
                   (cx - 10 * u, cy + 46 * u), (cx + 26 * u, cy - 8 * u), (cx + 2 * u, cy - 8 * u)],
                  fill=color, outline=dark, width=w)
        eyes(ey=-4, gap=0, r=0)
    elif kind == "goban":
        d.rounded_rectangle([cx - 40 * u, cy - 40 * u, cx + 40 * u, cy + 40 * u], radius=10 * u, fill=(240, 210, 160, 255), outline=dark, width=w)
        for i in range(1, 5):
            d.line([(cx - 40 * u + i * 16 * u, cy - 40 * u), (cx - 40 * u + i * 16 * u, cy + 40 * u)], fill=(90, 70, 50, 255), width=max(1, int(1.2 * u)))
            d.line([(cx - 40 * u, cy - 40 * u + i * 16 * u), (cx + 40 * u, cy - 40 * u + i * 16 * u)], fill=(90, 70, 50, 255), width=max(1, int(1.2 * u)))
        d.ellipse([cx - 20 * u, cy - 20 * u, cx - 4 * u, cy - 4 * u], fill=(24, 28, 40, 255), outline=dark, width=max(1, int(1 * u)))
        d.ellipse([cx + 4 * u, cy + 4 * u, cx + 20 * u, cy + 20 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1 * u)))
        d.ellipse([cx + 4 * u, cy - 20 * u, cx + 20 * u, cy - 4 * u], fill=(255, 255, 255, 255), outline=dark, width=max(1, int(1 * u)))
    else:  # pad
        d.rounded_rectangle([cx - 42 * u, cy - 26 * u, cx + 42 * u, cy + 28 * u], radius=18 * u, fill=color, outline=dark, width=w)
        d.ellipse([cx - 28 * u, cy - 12 * u, cx - 8 * u, cy + 8 * u], fill=light, outline=dark, width=max(1, int(1.2 * u)))
        d.rectangle([cx - 13 * u, cy - 3 * u, cx + 8 * u, cy + 3 * u], fill=(24, 30, 50, 255))
        d.rectangle([cx - 18 * u, cy - 2 * u, cx - 8 * u, cy + 2 * u], fill=(24, 30, 50, 255))
        for p in [(16, -8), (26, -8), (16, 2), (26, 2)]:
            d.ellipse([cx + p[0] * u - 5 * u, cy + p[1] * u - 5 * u, cx + p[0] * u + 5 * u, cy + p[1] * u + 5 * u],
                      fill=(255, 255, 255, 240), outline=dark, width=max(1, int(1.1 * u)))
        eyes(ey=-34, gap=0, r=0)
        d.ellipse([cx - 34 * u, cy - 22 * u, cx - 22 * u, cy - 14 * u], fill=(255, 255, 255, 110))
    return img
