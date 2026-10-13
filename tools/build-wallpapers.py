#!/usr/bin/env python3
"""Generate the Ubuntu Glass wallpapers as SVG.

The four wallpapers are defined in the approved prototype as layered CSS
gradients. This script translates those definitions into SVG, one file per
wallpaper and appearance, written to extension/wallpapers/.

Usage: python3 tools/build-wallpapers.py
"""

import math
import pathlib
import re

WIDTH, HEIGHT = 3840, 2160
OUT = pathlib.Path(__file__).resolve().parent.parent / "extension" / "wallpapers"


def radial(rx, ry, cx, cy, color, stop):
    """An elliptical gradient fading from `color` to transparent at `stop`."""
    return {"rx": rx, "ry": ry, "cx": cx, "cy": cy, "color": color, "stop": stop}


def glow(a, b, c):
    """The three-glow arrangement shared by Ember, Dusk and Tide."""
    return [
        radial(0.70, 0.80, 0.10, 1.00, a, 0.62),
        radial(0.60, 0.75, 0.92, 0.00, b, 0.64),
        radial(0.45, 0.55, 0.72, 0.92, c, 0.62),
    ]


WALLPAPERS = {
    "ember": {
        "dark": (glow("rgba(233,96,44,0.46)", "rgba(119,41,83,0.6)", "rgba(70,110,180,0.26)"),
                 (160, "#1B1A20", "#0F1013")),
        "light": (glow("rgba(240,140,90,0.5)", "rgba(190,140,175,0.5)", "rgba(140,175,225,0.42)"),
                  (160, "#F4F1EC", "#E3E0DB")),
    },
    "dusk": {
        "dark": (glow("rgba(150,60,110,0.55)", "rgba(233,110,60,0.32)", "rgba(119,41,83,0.4)"),
                 (160, "#18131B", "#0D0B0F")),
        "light": (glow("rgba(210,160,190,0.6)", "rgba(245,170,120,0.45)", "rgba(200,170,210,0.4)"),
                  (160, "#F3ECEF", "#E2D9DE")),
    },
    "tide": {
        "dark": (glow("rgba(60,110,190,0.5)", "rgba(90,170,180,0.3)", "rgba(60,90,160,0.3)"),
                 (160, "#10151C", "#0B0E12")),
        "light": (glow("rgba(140,180,230,0.55)", "rgba(160,215,215,0.45)", "rgba(170,190,235,0.4)"),
                  (160, "#EEF2F5", "#DCE3E9")),
    },
    "graphite": {
        "dark": ([radial(0.80, 0.60, 0.50, 0.00, "rgba(255,255,255,0.07)", 0.70)],
                 (170, "#1C1D20", "#111214")),
        "light": ([radial(0.80, 0.60, 0.50, 0.00, "rgba(255,255,255,0.85)", 0.70)],
                  (170, "#ECEBE8", "#D9D8D5")),
    },
}


def parse_rgba(text):
    r, g, b, a = re.fullmatch(r"rgba\((\d+),(\d+),(\d+),([\d.]+)\)", text).groups()
    return f"rgb({r},{g},{b})", float(a)


def linear_endpoints(angle):
    """Start and end points of a CSS linear-gradient line, in pixels."""
    theta = math.radians(angle)
    dx, dy = math.sin(theta), -math.cos(theta)
    half = (abs(WIDTH * dx) + abs(HEIGHT * dy)) / 2
    cx, cy = WIDTH / 2, HEIGHT / 2
    return (cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half)


def render(glows, base):
    angle, start, end = base
    x1, y1, x2, y2 = linear_endpoints(angle)
    defs = [
        f'<linearGradient id="base" gradientUnits="userSpaceOnUse" '
        f'x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">'
        f'<stop offset="0" stop-color="{start}"/><stop offset="1" stop-color="{end}"/>'
        f'</linearGradient>'
    ]
    layers = [f'<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#base)"/>']

    # CSS paints the first gradient on top, so draw them in reverse.
    for index, g in reversed(list(enumerate(glows))):
        color, alpha = parse_rgba(g["color"])
        defs.append(
            f'<radialGradient id="glow{index}" cx="0" cy="0" r="1" '
            f'gradientTransform="translate({g["cx"]} {g["cy"]}) scale({g["rx"]} {g["ry"]})">'
            f'<stop offset="0" stop-color="{color}" stop-opacity="{alpha}"/>'
            f'<stop offset="{g["stop"]}" stop-color="{color}" stop-opacity="0"/>'
            f'</radialGradient>'
        )
        layers.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#glow{index})"/>')

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}">\n'
        f'  <defs>\n    ' + "\n    ".join(defs) + "\n  </defs>\n  "
        + "\n  ".join(layers) + "\n</svg>\n"
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, modes in WALLPAPERS.items():
        for mode, (glows, base) in modes.items():
            path = OUT / f"{name}-{mode}.svg"
            path.write_text(render(glows, base), encoding="utf-8")
            print(f"wrote {path.relative_to(OUT.parent.parent)}")


if __name__ == "__main__":
    main()
