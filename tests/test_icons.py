#!/usr/bin/env python3
"""Checks for the generated Ubuntu-Glass icon theme.

Run with:  python3 tests/test_icons.py
"""

import pathlib
import sys
import xml.dom.minidom

ROOT = pathlib.Path(__file__).resolve().parent.parent
THEME = ROOT / "icons" / "Ubuntu-Glass"
sys.path.insert(0, str(ROOT / "tools"))

from symbolic_icons import ICONS  # noqa: E402

failures = []


def check(condition, message):
    if not condition:
        failures.append(message)


# Every design has names, each a symbolic name, and no name is claimed twice.
seen = {}
for index, icon in enumerate(ICONS):
    check(icon.get("names") and icon.get("layers"), f"design {index} has no names or layers")
    for name in icon["names"]:
        check(name.endswith("-symbolic") or "-symbolic-" in name, f"{name} is not a symbolic name")
        check(name not in seen, f"{name} is defined by designs {seen.get(name)} and {index}")
        seen[name] = index
    for layer in icon["layers"]:
        check(layer[0] in ("s", "f"), f"{icon['names'][0]}: unknown layer kind {layer[0]!r}")

# Every generated symbolic icon is valid SVG, has no strokes (GNOME only
# recolours fills), and uses the standard symbolic ink.
symbolic = sorted((THEME / "symbolic").glob("*.svg"))
check(len(symbolic) == len(seen), f"{len(symbolic)} symbolic files for {len(seen)} names; regenerate the theme")
for path in symbolic:
    text = path.read_text(encoding="utf-8")
    try:
        xml.dom.minidom.parseString(text)
    except Exception as error:  # noqa: BLE001
        failures.append(f"{path.name}: invalid SVG ({error})")
        continue
    check("stroke=" not in text, f"{path.name} has a stroke, which GNOME will not recolour")
    check('fill="#2e3436"' in text, f"{path.name} does not use the symbolic ink colour")

# Every directory in index.theme exists and holds icons.
index = (THEME / "index.theme").read_text(encoding="utf-8")
directories = next(line for line in index.splitlines() if line.startswith("Directories=")).split("=", 1)[1]
for directory in directories.split(","):
    check(any((THEME / directory).glob("*.svg")), f"index.theme lists {directory}, which has no icons")
    check(f"[{directory}]" in index, f"index.theme has no section for {directory}")

# The status icons GNOME Shell asks for most are present.
for name in ["network-wireless-signal-excellent-symbolic", "network-wireless-offline-symbolic",
             "battery-level-50-symbolic", "battery-level-50-charging-symbolic", "battery-level-100-charged-symbolic",
             "audio-volume-high-symbolic", "audio-volume-muted-symbolic", "bluetooth-active-symbolic",
             "night-light-symbolic", "system-shutdown-symbolic", "window-close-symbolic"]:
    check((THEME / "symbolic" / f"{name}.svg").exists(), f"missing {name}")

print(f"{len(ICONS)} designs, {len(symbolic)} symbolic icons checked, {len(failures)} failed")
for failure in failures:
    print(f"  FAIL {failure}")
sys.exit(1 if failures else 0)
