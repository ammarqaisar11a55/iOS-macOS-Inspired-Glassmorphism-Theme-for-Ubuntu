#!/usr/bin/env bash
# Remove Ubuntu Glass for the current user.
#
# Disabling the extension makes it restore everything it changed: the dock
# layout, wallpaper, icon theme, system style and GTK stylesheets. This script
# disables it first, then deletes the installed files.
#
#   ./uninstall.sh           remove the extension and icon theme
#   ./uninstall.sh --purge   also forget the saved Glass Theme Settings

set -euo pipefail

UUID="ubuntu-glass@ammarqaisar11a55.github.io"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
EXT_DIR="$DATA/gnome-shell/extensions/$UUID"
ICON_DIR="$DATA/icons/Ubuntu-Glass"
IMPORT_LINE='@import url("ubuntu-glass.css"); /* Ubuntu Glass */'

if command -v gnome-extensions >/dev/null && gnome-extensions info "$UUID" >/dev/null 2>&1; then
    echo "Disabling the extension (this restores your previous desktop settings)"
    gnome-extensions disable "$UUID" 2>/dev/null || true
    sleep 1
fi

# If the icon theme is still selected, the shell was not running the extension
# and could not restore it. Fall back to Yaru rather than a theme that is
# about to disappear.
if [ "$(gsettings get org.gnome.desktop.interface icon-theme 2>/dev/null | tr -d "'")" = "Ubuntu-Glass" ]; then
    echo "Icon theme was still Ubuntu-Glass; switching to Yaru"
    gsettings set org.gnome.desktop.interface icon-theme Yaru
fi

# Same for the GTK stylesheets: remove our file and our one import line, and
# leave anything else in gtk.css exactly as it was.
for version in 4.0 3.0; do
    dir="$CONFIG/gtk-$version"
    rm -f "$dir/ubuntu-glass.css"
    if [ -f "$dir/gtk.css" ] && grep -qxF "$IMPORT_LINE" "$dir/gtk.css"; then
        grep -vxF "$IMPORT_LINE" "$dir/gtk.css" > "$dir/gtk.css.tmp" || true
        if [ -s "$dir/gtk.css.tmp" ] && grep -q '[^[:space:]]' "$dir/gtk.css.tmp"; then
            mv "$dir/gtk.css.tmp" "$dir/gtk.css"
        else
            rm -f "$dir/gtk.css.tmp" "$dir/gtk.css"
        fi
    fi
done

echo "Removing $EXT_DIR"
rm -rf "$EXT_DIR"
echo "Removing $ICON_DIR"
rm -rf "$ICON_DIR"
rm -rf "${XDG_CACHE_HOME:-$HOME/.cache}/ubuntu-glass"

if [ "${1:-}" = "--purge" ]; then
    echo "Forgetting saved Glass Theme Settings"
    dconf reset -f /org/gnome/shell/extensions/ubuntu-glass/ 2>/dev/null || true
fi

echo "Done. Log out and back in to finish unloading the extension."
