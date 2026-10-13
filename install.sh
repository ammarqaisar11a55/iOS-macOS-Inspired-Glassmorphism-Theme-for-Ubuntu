#!/usr/bin/env bash
# Install Ubuntu Glass for the current user.
#
# Copies the extension and the icon theme into your home directory. Nothing is
# installed system-wide, nothing needs sudo, and no desktop setting is changed
# until you enable the extension.

set -euo pipefail

UUID="ubuntu-glass@ammarqaisar11a55.github.io"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
EXT_DIR="$DATA/gnome-shell/extensions/$UUID"
ICON_DIR="$DATA/icons/Ubuntu-Glass"

for tool in glib-compile-schemas gnome-shell; do
    command -v "$tool" >/dev/null || { echo "error: $tool is required but was not found" >&2; exit 1; }
done

shell_major="$(gnome-shell --version | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
if ! grep -q "\"$shell_major\"" "$HERE/extension/metadata.json"; then
    echo "warning: GNOME Shell $shell_major is not listed as supported; the extension may not load." >&2
fi

echo "Installing extension to $EXT_DIR"
rm -rf "$EXT_DIR"
mkdir -p "$EXT_DIR"
cp -r "$HERE/extension/." "$EXT_DIR/"
glib-compile-schemas --strict "$EXT_DIR/schemas"

echo "Installing icon theme to $ICON_DIR"
rm -rf "$ICON_DIR"
mkdir -p "$(dirname "$ICON_DIR")"
cp -r "$HERE/icons/Ubuntu-Glass" "$ICON_DIR"

# Inherit from the icon theme in use now, so everything the theme does not
# draw itself (folders, file types, symbolic icons) keeps its current look.
current="$(gsettings get org.gnome.desktop.interface icon-theme 2>/dev/null | tr -d "'" || true)"
if [ -n "$current" ] && [ "$current" != "Ubuntu-Glass" ] && [ "$current" != "Yaru" ]; then
    sed -i "s/^Inherits=.*/Inherits=$current,Yaru,Adwaita,hicolor/" "$ICON_DIR/index.theme"
fi
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -f "$ICON_DIR" 2>/dev/null || true

cat <<MSG

Installed.

Next steps:
  1. Log out and back in, so GNOME Shell finds the new extension.
     (On Wayland the shell cannot be restarted in place.)
  2. Enable it:
         gnome-extensions enable $UUID
     or switch on "Ubuntu Glass" in the Extensions app.
  3. Open Glass Theme Settings from the Glass tile in Quick Settings, or run:
         gnome-extensions prefs $UUID

To remove it again, run ./uninstall.sh
MSG
