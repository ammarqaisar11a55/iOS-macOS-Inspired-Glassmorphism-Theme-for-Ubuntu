"""Symbolic icon designs for the Ubuntu-Glass icon theme.

Symbolic icons are the small one-colour icons in the top bar, Quick Settings,
menus and application header bars. The glyphs are the ones used in the
approved mockup (Lucide outlines, ISC licence), drawn on a 24-unit grid.

Each design is a dict:

    names   icon names it is installed as
    layers  list of (kind, path) or (kind, path, options):
              kind "s" strokes the path, "f" fills it
              options: {"opacity": 0.3} dims a part (signal levels),
                       {"class": "error"} lets GNOME colour it as an error

tools/build-icons.py converts strokes into filled outlines, because GNOME
recolours symbolic icons through their fill.
"""


def circle(x, y, r):
    return f"M{x - r} {y}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0"


def rect(x, y, w, h, r):
    return (f"M{x + r} {y}h{w - 2 * r}a{r} {r} 0 0 1 {r} {r}v{h - 2 * r}"
            f"a{r} {r} 0 0 1 {-r} {r}h{2 * r - w}a{r} {r} 0 0 1 {-r} {-r}"
            f"v{2 * r - h}a{r} {r} 0 0 1 {r} {-r}z")


DIM = {"opacity": 0.3}

ICONS = []

# Wi-Fi: a dot and three arcs. Signal strength dims the arcs that are not reached.
WIFI_DOT = "M12 20h.01"
WIFI_ARCS = ["M8.5 16.429a5 5 0 0 1 7 0", "M5 12.859a10 10 0 0 1 14 0", "M2 8.82a15 15 0 0 1 20 0"]
WIFI_OFF = ("M12 20h.01M8.5 16.429a5 5 0 0 1 7 0M5 12.859a10 10 0 0 1 5.17-2.69M19 12.859a10 10 0 0 0-2.007-1.523"
            "M2 8.82a15 15 0 0 1 4.177-2.643M22 8.82a15 15 0 0 0-11.288-3.764M2 2l20 20")


def wifi(level):
    """level 0-3: how many arcs are drawn at full strength."""
    return [("s", WIFI_DOT)] + [("s", arc) if i < level else ("s", arc, DIM) for i, arc in enumerate(WIFI_ARCS)]


ICONS += [
    {"names": ["network-wireless-signal-excellent-symbolic", "network-wireless-connected-symbolic",
               "network-wireless-symbolic", "network-wireless-hotspot-symbolic"], "layers": wifi(3)},
    {"names": ["network-wireless-signal-good-symbolic"], "layers": wifi(2)},
    {"names": ["network-wireless-signal-ok-symbolic"], "layers": wifi(1)},
    {"names": ["network-wireless-signal-weak-symbolic", "network-wireless-acquiring-symbolic"], "layers": wifi(0)},
    {"names": ["network-wireless-signal-none-symbolic"], "layers": [("s", WIFI_DOT, DIM)] + [("s", a, DIM) for a in WIFI_ARCS]},
    {"names": ["network-wireless-offline-symbolic", "network-wireless-disabled-symbolic",
               "network-wireless-no-route-symbolic", "network-wireless-hardware-disabled-symbolic"],
     "layers": [("s", WIFI_OFF)]},
]

# Wired network: an Ethernet port.
ETHERNET = "m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3zM6 8v1M10 8v1M14 8v1M18 8v1"
ICONS += [
    {"names": ["network-wired-symbolic", "network-wired-acquiring-symbolic"], "layers": [("s", ETHERNET)]},
    {"names": ["network-wired-disconnected-symbolic", "network-wired-offline-symbolic",
               "network-wired-no-route-symbolic"], "layers": [("s", ETHERNET, DIM), ("s", "M2 2l20 20")]},
]

# Bluetooth rune.
BLUETOOTH = "m7 7 10 10-5 5V2l5 5L7 17"
ICONS += [
    {"names": ["bluetooth-active-symbolic", "bluetooth-symbolic", "bluetooth-disconnected-symbolic"],
     "layers": [("s", BLUETOOTH)]},
    {"names": ["bluetooth-disabled-symbolic", "bluetooth-hardware-disabled-symbolic"],
     "layers": [("s", BLUETOOTH, DIM), ("s", "M3 3l18 18")]},
]
