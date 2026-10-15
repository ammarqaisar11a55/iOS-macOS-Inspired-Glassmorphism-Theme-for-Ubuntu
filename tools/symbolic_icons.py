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

# Airplane mode.
PLANE = ("M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5"
         "c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z")
ICONS += [
    {"names": ["airplane-mode-symbolic"], "layers": [("s", PLANE)]},
    {"names": ["airplane-mode-disabled-symbolic"], "layers": [("s", PLANE, DIM), ("s", "M2 2l20 20")]},
]

# Battery: outline with a fill bar for the charge. While charging, the bar is
# dimmed and a bolt sits on top. Low and empty batteries are tagged "error"
# so GNOME can colour them red.
BATTERY = rect(2, 7, 16, 10, 2) + "M22 11v2"
BATTERY_BOLT = "M10.6 8.6 7.4 12.4h3l-1.2 3 3.4-4h-3z"


def battery(level, charging=False):
    layers = [("s", BATTERY)]
    width = round(11 * level / 100, 2)
    if width > 0:
        options = {"opacity": 0.35} if charging else ({"class": "error"} if level <= 10 else {})
        layers.append(("f", rect(4.5, 9.5, max(width, 1), 5, 0.6 if width >= 1.2 else 0), options))
    if charging:
        layers.append(("f", BATTERY_BOLT))
    return layers


for level in range(0, 101, 10):
    ICONS.append({"names": [f"battery-level-{level}-symbolic"], "layers": battery(level)})
    ICONS.append({"names": [f"battery-level-{level}-charging-symbolic"], "layers": battery(level, True)})

ICONS += [
    {"names": ["battery-level-100-charged-symbolic", "battery-full-charged-symbolic"], "layers": battery(100)},
    {"names": ["battery-full-symbolic", "battery-symbolic"], "layers": battery(100)},
    {"names": ["battery-good-symbolic"], "layers": battery(70)},
    {"names": ["battery-low-symbolic"], "layers": battery(30)},
    {"names": ["battery-caution-symbolic"], "layers": battery(10)},
    {"names": ["battery-empty-symbolic"], "layers": battery(0)},
    {"names": ["battery-full-charging-symbolic"], "layers": battery(100, True)},
    {"names": ["battery-good-charging-symbolic"], "layers": battery(70, True)},
    {"names": ["battery-low-charging-symbolic"], "layers": battery(30, True)},
    {"names": ["battery-caution-charging-symbolic", "battery-empty-charging-symbolic"], "layers": battery(10, True)},
    {"names": ["battery-missing-symbolic"], "layers": [("s", BATTERY, DIM), ("s", "M10 10.5v1.8M10 14h.01")]},
]

# Speaker with up to two sound waves; muted shows a cross.
SPEAKER = "M11 5 6 9H2v6h4l5 4z"
WAVE_NEAR = "M15.54 8.46a5 5 0 0 1 0 7.07"
WAVE_FAR = "M19.07 4.93a10 10 0 0 1 0 14.14"
ICONS += [
    {"names": ["audio-volume-high-symbolic", "audio-volume-overamplified-symbolic"],
     "layers": [("s", SPEAKER), ("s", WAVE_NEAR), ("s", WAVE_FAR)]},
    {"names": ["audio-volume-medium-symbolic"], "layers": [("s", SPEAKER), ("s", WAVE_NEAR), ("s", WAVE_FAR, DIM)]},
    {"names": ["audio-volume-low-symbolic"], "layers": [("s", SPEAKER), ("s", WAVE_NEAR, DIM), ("s", WAVE_FAR, DIM)]},
    {"names": ["audio-volume-muted-symbolic", "audio-volume-muted-blocking-symbolic"],
     "layers": [("s", SPEAKER), ("s", "M22 9l-6 6M16 9l6 6")]},
]

# Microphone; muted adds a slash.
MIC = "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"
ICONS += [
    {"names": ["audio-input-microphone-symbolic", "audio-input-microphone-high-symbolic",
               "audio-input-microphone-medium-symbolic", "audio-input-microphone-low-symbolic",
               "microphone-sensitivity-high-symbolic", "microphone-sensitivity-medium-symbolic",
               "microphone-sensitivity-low-symbolic"], "layers": [("s", MIC)]},
    {"names": ["audio-input-microphone-muted-symbolic", "microphone-sensitivity-muted-symbolic",
               "microphone-disabled-symbolic"], "layers": [("s", MIC, DIM), ("s", "M2 2l20 20")]},
]

# Output devices for the sound menu.
ICONS += [
    {"names": ["audio-speakers-symbolic", "audio-card-symbolic"],
     "layers": [("s", rect(4, 2, 16, 20, 2) + circle(12, 14, 4) + "M12 6h.01")]},
    {"names": ["audio-headphones-symbolic", "audio-headset-symbolic"],
     "layers": [("s", "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1"
                      "a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3")]},
]

# Sun for screen brightness.
SUN = circle(12, 12, 4) + ("M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"
                           "M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41")
ICONS += [
    {"names": ["display-brightness-symbolic", "display-brightness-high-symbolic",
               "display-brightness-medium-symbolic", "display-brightness-low-symbolic",
               "weather-clear-symbolic", "keyboard-brightness-symbolic"], "layers": [("s", SUN)]},
    {"names": ["display-brightness-off-symbolic"], "layers": [("s", SUN, DIM)]},
]

# Crescent moon for Night Light.
MOON = "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
ICONS += [
    {"names": ["night-light-symbolic", "weather-clear-night-symbolic"], "layers": [("s", MOON)]},
    {"names": ["night-light-disabled-symbolic"], "layers": [("s", MOON, DIM), ("s", "M2 2l20 20")]},
]

# Half-filled circle for the dark style toggle.
ICONS += [
    {"names": ["dark-mode-symbolic", "display-dark-mode-symbolic", "preferences-desktop-appearance-symbolic"],
     "layers": [("s", circle(12, 12, 10)), ("f", "M12 6a6 6 0 0 1 0 12z")]},
]

# Power profiles: leaf for saver, gauge for balanced, bolt for performance.
ICONS += [
    {"names": ["power-profile-power-saver-symbolic"],
     "layers": [("s", "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
                      "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12")]},
    {"names": ["power-profile-balanced-symbolic"], "layers": [("s", "M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0")]},
    {"names": ["power-profile-performance-symbolic"],
     "layers": [("s", "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7"
                      "a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z")]},
]

# Bell for notifications; Do Not Disturb strikes it through.
BELL = "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"
ICONS += [
    {"names": ["preferences-system-notifications-symbolic", "notifications-symbolic",
               "org.gnome.Settings-notifications-symbolic", "alarm-symbolic"], "layers": [("s", BELL)]},
    {"names": ["notifications-disabled-symbolic", "do-not-disturb-symbolic", "user-busy-symbolic"],
     "layers": [("s", "M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"
                      "M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20")]},
]

# Settings: two sliders, as in the design's dock and quick settings.
ICONS += [
    {"names": ["org.gnome.Settings-symbolic", "preferences-system-symbolic", "emblem-system-symbolic",
               "applications-system-symbolic", "settings-symbolic", "preferences-other-symbolic"],
     "layers": [("s", "M20 7h-9M14 17H5" + circle(17, 17, 3) + circle(7, 7, 3))]},
]

ICONS += [
    {"names": ["system-shutdown-symbolic", "system-power-symbolic", "gnome-power-manager-symbolic"],
     "layers": [("s", "M12 2v10M18.4 6.6a9 9 0 1 1-12.77.04")]},
]

ICONS += [
    {"names": ["system-reboot-symbolic", "view-refresh-symbolic", "system-restart-symbolic"],
     "layers": [("s", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5")]},
]

ICONS += [
    {"names": ["system-log-out-symbolic", "application-exit-symbolic"],
     "layers": [("s", "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9")]},
]

LOCK = rect(3, 11, 18, 11, 2) + "M7 11V7a5 5 0 0 1 10 0v4"
ICONS += [
    {"names": ["system-lock-screen-symbolic", "changes-prevent-symbolic", "channel-secure-symbolic",
               "network-wireless-encrypted-symbolic"], "layers": [("s", LOCK)]},
    {"names": ["changes-allow-symbolic", "channel-insecure-symbolic"],
     "layers": [("s", rect(3, 11, 18, 11, 2) + "M7 11V7a5 5 0 0 1 9.9-1")]},
]
