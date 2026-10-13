#!/usr/bin/env python3
"""Generate the Ubuntu-Glass icon theme.

App icons in the approved design are rounded tiles: a two-stop gradient of
one hue with a thin white glyph. This script draws those tiles as SVG and
writes them under icons/Ubuntu-Glass/, once for each icon name that the
matching application is known by.

Glyph outlines are from Lucide (https://lucide.dev), ISC licence.

Usage: python3 tools/build-icons.py
"""

import pathlib
import shutil

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons" / "Ubuntu-Glass"

SIZE = 64          # canvas
TILE = 56          # tile edge, centred on the canvas
RADIUS = 16        # tile corner radius
GLYPH = 28         # glyph edge; Lucide is drawn on a 24 px grid
INK = "#2A2A2D"    # glyph colour on light tiles


def circle(x, y, r):
    return f"M{x - r} {y}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0"


def rect(x, y, w, h, r):
    return (f"M{x + r} {y}h{w - 2 * r}a{r} {r} 0 0 1 {r} {r}v{h - 2 * r}"
            f"a{r} {r} 0 0 1 {-r} {r}h{2 * r - w}a{r} {r} 0 0 1 {-r} {-r}"
            f"v{2 * r - h}a{r} {r} 0 0 1 {r} {-r}z")


GLYPHS = {
    "folder": "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4"
              "a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
    "globe": circle(12, 12, 10) + "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20",
    "term": "M4 17l6-6-6-6M12 19h8",
    "code": "M16 18l6-6-6-6M8 6l-6 6 6 6",
    "mail": rect(2, 4, 20, 16, 2) + "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
    "music": "M9 18V5l12-2v13" + circle(6, 18, 3) + circle(18, 16, 3),
    "bag": "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
    "sliders": "M20 7h-9M14 17H5" + circle(17, 17, 3) + circle(7, 7, 3),
    "calendar": rect(3, 4, 18, 18, 2) + "M16 2v4M8 2v4M3 10h18",
    "camera": "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3"
              "l-2.5-3z" + circle(12, 13, 3),
    "image": rect(3, 3, 18, 18, 2) + circle(9, 9, 2) + "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
    "filetext": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4"
                "M10 9H8M16 13H8M16 17H8",
    "calc": rect(4, 2, 16, 20, 2) + "M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"
            "M8 18h.01M12 18h.01M16 18h.01",
    "video": "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"
             + rect(2, 6, 14, 12, 2),
    "gauge": "m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0",
    "drive": "M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4"
             "H7.24a2 2 0 0 0-1.79 1.11zM6 16h.01M10 16h.01",
}

GRADIENTS = {
    "blue": ("#5A93D8", "#336FB8"),
    "orange": ("#F08A4B", "#D9612B"),
    "graphite": ("#3E3F45", "#222327"),
    "aub": ("#94477A", "#6A2A50"),
    "sky": ("#7DB2E6", "#4A86C8"),
    "coral": ("#EE7A70", "#C9443F"),
    "amber": ("#F3A06A", "#E2703A"),
    "silver": ("#E8E7E4", "#BDBCB8"),
    "green": ("#6CC08E", "#3E9A63"),
    "slate": ("#77839A", "#4A5466"),
}

# (glyph, gradient, light tile?, icon names). Names cover the application IDs
# and the generic freedesktop names each application's launcher may ask for.
APPS = [
    ("folder", "blue", False, ["org.gnome.Nautilus", "nautilus", "system-file-manager"]),
    ("globe", "orange", False, ["firefox", "org.mozilla.firefox", "web-browser", "org.gnome.Epiphany"]),
    ("term", "graphite", False, ["org.gnome.Ptyxis", "org.gnome.Terminal", "org.gnome.Console",
                                 "utilities-terminal", "gnome-terminal"]),
    ("code", "aub", False, ["code", "com.visualstudio.code", "visual-studio-code", "vscode"]),
    ("mail", "sky", False, ["thunderbird", "org.mozilla.Thunderbird", "mail-client", "org.gnome.Geary"]),
    ("music", "coral", False, ["org.gnome.Rhythmbox3", "rhythmbox", "org.gnome.Music",
                               "multimedia-audio-player"]),
    ("bag", "amber", False, ["snap-store", "io.snapcraft.Store", "org.gnome.Software",
                             "system-software-install"]),
    ("sliders", "silver", True, ["org.gnome.Settings", "gnome-control-center", "preferences-system"]),
    ("calendar", "slate", False, ["org.gnome.Calendar", "x-office-calendar", "office-calendar"]),
    ("camera", "graphite", False, ["org.gnome.Snapshot", "org.gnome.Cheese", "camera-photo"]),
    ("image", "green", False, ["org.gnome.Loupe", "org.gnome.eog", "eog", "image-viewer"]),
    ("filetext", "silver", True, ["org.gnome.TextEditor", "org.gnome.gedit", "accessories-text-editor"]),
    ("calc", "slate", False, ["org.gnome.Calculator", "gnome-calculator", "accessories-calculator"]),
    ("video", "coral", False, ["org.gnome.Showtime", "org.gnome.Totem", "totem", "video-player"]),
    ("gauge", "green", False, ["org.gnome.SystemMonitor", "gnome-system-monitor",
                               "utilities-system-monitor", "net.nokyan.Resources"]),
    ("drive", "silver", True, ["org.gnome.DiskUtility", "gnome-disks"]),
]

INDEX = """[Icon Theme]
Name=Ubuntu-Glass
Comment=Rounded app tiles for the Ubuntu Glass theme
Inherits=Yaru,Adwaita,hicolor
Directories=scalable/apps

[scalable/apps]
Size=64
MinSize=16
MaxSize=512
Type=Scalable
Context=Applications
"""


def render(glyph, gradient, light):
    top, bottom = GRADIENTS[gradient]
    inset = (SIZE - TILE) / 2
    scale = GLYPH / 24
    offset = (SIZE - GLYPH) / 2
    ink = INK if light else "#FFFFFF"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{top}"/>
      <stop offset="1" stop-color="{bottom}"/>
    </linearGradient>
  </defs>
  <rect x="{inset}" y="{inset + 1}" width="{TILE}" height="{TILE}" rx="{RADIUS}" fill="#000000" opacity="0.18"/>
  <rect x="{inset}" y="{inset}" width="{TILE}" height="{TILE}" rx="{RADIUS}" fill="url(#tile)"/>
  <rect x="{inset + 0.5}" y="{inset + 0.5}" width="{TILE - 1}" height="{TILE - 1}" rx="{RADIUS - 0.5}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22"/>
  <path transform="translate({offset} {offset}) scale({scale:.4f})" d="{GLYPHS[glyph]}" fill="none" stroke="{ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"""


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    apps = OUT / "scalable" / "apps"
    apps.mkdir(parents=True)
    (OUT / "index.theme").write_text(INDEX, encoding="utf-8")

    count = 0
    for glyph, gradient, light, names in APPS:
        svg = render(glyph, gradient, light)
        for name in names:
            (apps / f"{name}.svg").write_text(svg, encoding="utf-8")
            count += 1
    print(f"wrote {count} icons for {len(APPS)} applications to {OUT.relative_to(OUT.parent.parent)}")


if __name__ == "__main__":
    main()
