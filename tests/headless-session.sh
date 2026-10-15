#!/usr/bin/env bash
# Runs inside the isolated session started by tests/headless.sh. Not meant to
# be run directly: it assumes HOME and the D-Bus session are throwaway.

set -uo pipefail

case "$HOME" in
    */glass-test.*/home) ;;
    *) echo "FAIL refusing to run outside the test sandbox (HOME=$HOME)"; exit 1 ;;
esac

EXT="$HOME/.local/share/gnome-shell/extensions/$UUID"
SCHEMAS="$EXT/schemas"
DOCK=org.gnome.shell.extensions.dash-to-dock
IFACE=org.gnome.desktop.interface
BG=org.gnome.desktop.background
WL=wl-glass-test
fails=0

ok()   { echo "ok   $1"; }
fail() { echo "FAIL $1"; fails=$((fails + 1)); }
check() { # check <description> <actual> <expected>
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (expected '$3', got '$2')"; fi
}
contains() { # contains <description> <haystack> <needle>
    case "$2" in *"$3"*) ok "$1" ;; *) fail "$1 (no '$3' in '${2:0:160}')" ;; esac
}
lacks() {
    case "$2" in *"$3"*) fail "$1 (found '$3')" ;; *) ok "$1" ;; esac
}

glass()  { gsettings --schemadir "$SCHEMAS" "$1" org.gnome.shell.extensions.ubuntu-glass "${@:2}"; }
gset()   { glass set "$@"; sleep 0.6; }
gget()   { glass get "$1" | tr -d "'"; }
sys()    { gsettings get "$1" "$2" | tr -d "'"; }
# Evaluate JavaScript in the shell and print the result without quoting.
js() {
    gdbus call --session --timeout 10 --dest org.gnome.Shell --object-path /org/gnome/Shell \
        --method org.gnome.Shell.Eval "$1" 2>&1 |
        sed -E "s/^\(true, '(.*)'\)$/\1/; s/^\"(.*)\"$/\1/"
}
shot() {
    [ -n "$SHOTS" ] || return 0
    gdbus call --session --dest org.gnome.Shell.Screenshot --object-path /org/gnome/Shell/Screenshot \
        --method org.gnome.Shell.Screenshot.Screenshot false false "$SHOTS/$1.png" >/dev/null 2>&1
}
state()  { js "Main.extensionManager.lookup('$UUID')?.state ?? -1"; }
blurs()  { js "(() => { let n = 0; const walk = a => { if (a.get_effect('ubuntu-glass-blur')) n++; a.get_children().forEach(walk); }; walk(Main.uiGroup); return n; })()"; }
sheet()  { cat "$(js "imports.gi.St.ThemeContext.get_for_stage(global.stage).get_theme().get_custom_stylesheets().map(f => f.get_path()).filter(p => p.includes('ubuntu-glass'))[0] ?? ''")" 2>/dev/null; }

alive() { # print a native stack if the shell has stopped answering
    [ "$(js 1)" = "1" ] && return 0
    echo "FAIL shell stopped responding $1"
    # Tell a blocked main loop apart from Eval merely being refused.
    echo "note   Eval answered: $(gdbus call --session --timeout 10 --dest org.gnome.Shell \
        --object-path /org/gnome/Shell --method org.gnome.Shell.Eval 1 2>&1 | head -c 200)"
    echo "note   other D-Bus call: $(gdbus call --session --timeout 10 --dest org.gnome.Shell \
        --object-path /org/gnome/Shell --method org.freedesktop.DBus.Properties.Get \
        org.gnome.Shell ShellVersion 2>&1 | head -c 120)"
    echo "note   process: $(ps -o %cpu=,stat=,etimes= -p "$SHELL_PID")"
    echo "note   enabled: $(gnome-extensions list --enabled 2>&1 | tr '\n' ' ')"
    echo "note   state: $(gnome-extensions info "$UUID" 2>&1 | grep -i -E 'state|error' | tr '\n' ' ')"
    echo "note   helper: $(gnome-extensions info glass-test@local 2>&1 | grep -i -E 'state|error' | tr '\n' ' ')"
    grep -E 'JS ERROR|Extension|unsafe|ubuntu-glass' "$HOME/shell.log" | grep -v DING | tail -12 | cut -c1-220 | sed 's/^/note   /'
    exit 1
}

# --- 1. Install with the documented procedure ---------------------------------
echo "== install"
bash "$REPO/install.sh" >/dev/null && ok "install.sh succeeds" || fail "install.sh"
[ -f "$SCHEMAS/gschemas.compiled" ] && ok "schema compiled" || fail "schema compiled"
[ -f "$HOME/.local/share/icons/Ubuntu-Glass/index.theme" ] && ok "icon theme installed" || fail "icon theme installed"

# A helper extension that only switches on the shell's unsafe mode, which the
# test needs for Eval and screenshots.
HELPER="$HOME/.local/share/gnome-shell/extensions/glass-test@local"
mkdir -p "$HELPER"
shell_major="$(gnome-shell --version | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
cat > "$HELPER/metadata.json" <<J
{"uuid": "glass-test@local", "name": "Glass test helper", "description": "Test only", "shell-version": ["$shell_major"]}
J
cat > "$HELPER/extension.js" <<'J'
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
export default class Helper extends Extension {
    enable() { global.context.unsafe_mode = true; }
    disable() { global.context.unsafe_mode = false; }
}
J

# Values the extension must put back at the end.
gsettings set $DOCK dock-position LEFT
gsettings set $DOCK extend-height true
gsettings set $IFACE color-scheme default
gsettings set $IFACE icon-theme Yaru
ORIG_WALL="$(sys $BG picture-uri)"
PTYXIS=org.gnome.Ptyxis
PROFILE="org.gnome.Ptyxis.Profile:/org/gnome/Ptyxis/Profiles/glasstest/"
PALETTE_FILE="$HOME/.local/share/org.gnome.Ptyxis/palettes/Ubuntu-Glass.palette"
gsettings set $PTYXIS profile-uuids "['glasstest']"
gsettings set $PTYXIS default-profile-uuid glasstest
gsettings set "$PROFILE" palette Ubuntu
gsettings set "$PROFILE" opacity 1.0
mkdir -p "$HOME/.config/gtk-4.0"
echo "window { margin: 0; }" > "$HOME/.config/gtk-4.0/gtk.css"

gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.shell enabled-extensions "['ubuntu-dock@ubuntu.com', '$UUID', 'glass-test@local']"
gsettings set org.gnome.shell welcome-dialog-last-shown-version 999 2>/dev/null

dbus-update-activation-environment WAYLAND_DISPLAY=$WL GDK_BACKEND=wayland 2>/dev/null
gnome-shell --headless --no-x11 --virtual-monitor 1920x1080 --mode=ubuntu --wayland-display $WL \
    > "$HOME/shell.log" 2>&1 &
SHELL_PID=$!
for _ in $(seq 1 60); do [ "$(js 1)" = "1" ] && break; sleep 0.5; done
[ "$(js 1)" = "1" ] || alive "during startup"
sleep 3
js "Main.overview.hide()" >/dev/null

# --- 2. Enabled state ---------------------------------------------------------
echo "== enable"
check "extension is active" "$(state)" 1
contains "stylesheet is loaded" "$(sheet)" "/* Top bar */"
check "dock moved to the bottom" "$(sys $DOCK dock-position)" BOTTOM
check "dock is no longer full length" "$(sys $DOCK extend-height)" false
contains "previous dock layout is backed up" "$(gget backup)" "dock:dock-position"
[ "$(blurs)" -ge 2 ] && ok "top bar and dock are blurred" || fail "top bar and dock are blurred ($(blurs))"
contains "GTK 4 stylesheet imported" "$(cat "$HOME/.config/gtk-4.0/gtk.css")" 'ubuntu-glass.css'
contains "existing gtk.css content kept" "$(cat "$HOME/.config/gtk-4.0/gtk.css")" 'window { margin: 0; }'
[ -f "$HOME/.config/gtk-3.0/ubuntu-glass.css" ] && ok "GTK 3 stylesheet written" || fail "GTK 3 stylesheet written"
[ -f "$PALETTE_FILE" ] && ok "terminal palette written" || fail "terminal palette written"
check "terminal profile uses the glass palette" "$(sys "$PROFILE" palette)" Ubuntu-Glass
check "terminal profile is translucent (light)" "$(sys "$PROFILE" opacity)" 0.93999999999999995
[ -f "$HOME/.local/share/icons/Ubuntu-Glass/scalable/places/folder.svg" ] && ok "folder icons installed" || fail "folder icons installed"
[ -f "$HOME/.local/share/icons/Ubuntu-Glass/scalable/mimetypes/text-x-generic.svg" ] && ok "file icons installed" || fail "file icons installed"
[ -f "$HOME/.local/share/icons/Ubuntu-Glass/symbolic/battery-level-50-symbolic.svg" ] && ok "symbolic icons installed" || fail "symbolic icons installed"
check "wallpaper untouched by default" "$(sys $BG picture-uri)" "$ORIG_WALL"
check "icon theme untouched by default" "$(sys $IFACE icon-theme)" Yaru
shot 01-light-desktop

# --- 3. Each feature toggles independently ------------------------------------
echo "== components"
alive "before components"
for pair in "panel-style:/* Top bar */" "dock-style:/* Dock */" \
            "quick-settings-style:/* Quick settings */" \
            "notifications-style:/* Notifications and calendar */" \
            "menus-style:/* Menus and tooltips */" "dialogs-style:/* Dialogs and overlays */" \
            "overview-style:/* Overview */"; do
    key="${pair%%:*}"; marker="${pair#*:}"
    gset "$key" false
    css="$(sheet)"
    lacks "$key off removes its rules" "$css" "$marker"
    others=$(grep -c -E '^/\* [A-Za-z ]+ \*/$' <<<"$css")
    check "$key off leaves the other 6 sections" "$others" 6
    gset "$key" true
    contains "$key on restores its rules" "$(sheet)" "$marker"
done

gset dock-style false
check "dock-style off restores dock position" "$(sys $DOCK dock-position)" LEFT
check "dock-style off restores dock length" "$(sys $DOCK extend-height)" true
gset dock-style true
check "dock-style on floats the dock again" "$(sys $DOCK dock-position)" BOTTOM

gset window-style false
[ ! -e "$HOME/.config/gtk-4.0/ubuntu-glass.css" ] && ok "window-style off removes the GTK stylesheet" || fail "window-style off removes the GTK stylesheet"
check "window-style off leaves the user's gtk.css as it was" "$(cat "$HOME/.config/gtk-4.0/gtk.css")" "window { margin: 0; }"
[ ! -e "$HOME/.config/gtk-3.0/gtk.css" ] && ok "gtk.css we created is removed" || fail "gtk.css we created is removed"
gset window-style true

gset terminal-style false
check "terminal-style off restores the palette" "$(sys "$PROFILE" palette)" Ubuntu
check "terminal-style off restores the opacity" "$(sys "$PROFILE" opacity)" 1.0
[ ! -e "$PALETTE_FILE" ] && ok "terminal-style off removes the palette file" || fail "terminal-style off removes the palette file"
gset terminal-style true
check "terminal-style on applies the palette again" "$(sys "$PROFILE" palette)" Ubuntu-Glass

echo "== appearance"
alive "before appearance"
gset background-blur false
check "blur off removes every blur effect" "$(blurs)" 0
gset background-blur true
[ "$(blurs)" -ge 2 ] && ok "blur on restores the effects" || fail "blur on restores the effects"
gset blur-intensity 50
check "blur intensity changes the radius" "$(js "Main.panel.get_effect('ubuntu-glass-blur').radius")" 30
gset blur-intensity 100

gset glass-effects false
contains "glass off uses solid surfaces" "$(sheet)" "rgba(241, 239, 235, 1) !important"
check "glass off also removes blur" "$(blurs)" 0
gset glass-effects true
gset transparency false
contains "transparency off makes the bar 96% opaque" "$(sheet)" ", 0.96) !important"
gset transparency true
gset glass-intensity 50
contains "glass intensity changes the tint" "$(sheet)" ", 0.79) !important"
gset glass-intensity 100
gset glass-borders false
contains "borders off makes edges transparent" "$(sheet)" "1px solid rgba(0, 0, 0, 0)"
gset glass-borders true
gset shadows false
lacks "shadows off removes drop shadows" "$(sheet)" "box-shadow: 0 4px 10px"
gset shadows true
contains "shadows on draws drop shadows" "$(sheet)" "box-shadow: 0 4px 10px"
gset shadows false
gset shadows true
gset rounded-corners false
lacks "rounded off drops the 22px radius" "$(sheet)" "border-radius: 22px"
gset rounded-corners true
gset accent blue
contains "accent changes the accent colour" "$(sheet)" "rgba(47, 109, 181, 1)"
gset accent orange
gset reduced-motion true
lacks "reduced motion removes transitions" "$(sheet)" "transition-duration: 1"
check "reduced motion stops dock animation" "$(sys $DOCK animation-time)" 0.0
gset reduced-motion false
check "dock animation time restored" "$(sys $DOCK animation-time)" 0.20000000000000001
gset high-contrast true
contains "high contrast strengthens edges" "$(sheet)" "rgba(0, 0, 0, 0.32)"
gset high-contrast false

echo "== light and dark"
alive "before light and dark"
gset appearance dark
check "dark appearance switches the system style" "$(sys $IFACE color-scheme)" prefer-dark
check "terminal opacity follows dark mode" "$(sys "$PROFILE" opacity)" 0.90000000000000002
contains "dark stylesheet in use" "$(sheet)" "(dark)"
shot 02-dark-desktop
gset appearance system
check "follow system restores the previous style" "$(sys $IFACE color-scheme)" default
contains "light stylesheet in use" "$(sheet)" "(light)"
gsettings set $IFACE color-scheme prefer-dark; sleep 0.8
contains "follows a system style change" "$(sheet)" "(dark)"
gset appearance light
check "light appearance switches the system style" "$(sys $IFACE color-scheme)" default
gsettings set $IFACE color-scheme prefer-dark; sleep 0.8
check "a manual system change wins over a forced mode" "$(gget appearance)" system
gsettings set $IFACE color-scheme default; sleep 0.5

echo "== desktop"
alive "before desktop"
gset wallpaper true
contains "theme wallpaper applied (light)" "$(sys $BG picture-uri)" "wallpapers/ember-light.svg"
contains "theme wallpaper applied (dark)" "$(sys $BG picture-uri-dark)" "wallpapers/ember-dark.svg"
gset wallpaper-name tide
contains "wallpaper choice applied" "$(sys $BG picture-uri)" "wallpapers/tide-light.svg"
gset wallpaper false
check "wallpaper off restores the previous one" "$(sys $BG picture-uri)" "$ORIG_WALL"
gset icon-theme true
check "icon theme applied" "$(sys $IFACE icon-theme)" Ubuntu-Glass
gset icon-theme false
check "icon theme off restores the previous one" "$(sys $IFACE icon-theme)" Yaru
gset show-indicator false
check "Glass tile removed" "$(js "Main.extensionManager.lookup('$UUID').stateObj._indicator === null")" true
gset show-indicator true
check "Glass tile shown" "$(js "Main.extensionManager.lookup('$UUID').stateObj._indicator !== null")" true

# --- 4. Presets ---------------------------------------------------------------
echo "== presets"
alive "before presets"
check "defaults are the Full Glass preset" "$(gget preset)" full
gset shadows false
check "a manual change becomes Custom" "$(gget preset)" custom
gset shadows true
check "returning to the preset values selects it again" "$(gget preset)" full
gset wallpaper true; gset accent sage
preset() { js "Main.extensionManager.lookup('$UUID').stateObj._indicator.quickSettingsItems[0]._presetItems.get('$1').activate(imports.gi.Clutter.get_current_event())" >/dev/null; sleep 0.8; }
preset performance
check "Performance preset recorded" "$(gget preset)" performance
check "Performance turns blur off" "$(gget background-blur)" false
check "Performance turns shadows off" "$(gget shadows)" false
check "preset leaves the wallpaper choice alone" "$(gget wallpaper)" true
check "preset leaves the accent alone" "$(gget accent)" sage
preset accessibility
check "Accessibility turns glass off" "$(gget glass-effects)" false
check "Accessibility turns high contrast on" "$(gget high-contrast)" true
preset balanced
check "Balanced sets intensity to 60" "$(gget glass-intensity)" 60
preset minimal
check "Minimal sets intensity to 20" "$(gget glass-intensity)" 20
preset full
check "Full Glass restores intensity" "$(gget glass-intensity)" 100
check "Full Glass restores blur" "$(gget background-blur)" true
gset wallpaper false; gset accent orange

# --- 5. Menus and the settings window -----------------------------------------
echo "== interface"
alive "before interface"
js "Main.panel.statusArea.quickSettings.menu.open()" >/dev/null; sleep 1.5
contains "Glass tile is in Quick Settings" "$(js "Main.panel.statusArea.quickSettings.menu._grid.get_children().map(c => c.title ?? '').join(',')")" "Glass"
shot 03-quick-settings
js "Main.panel.statusArea.quickSettings.menu.close()" >/dev/null
js "Main.panel.statusArea.dateMenu.menu.open()" >/dev/null; sleep 1.5
shot 04-calendar
js "Main.panel.statusArea.dateMenu.menu.close()" >/dev/null

gnome-extensions prefs "$UUID" 2>/dev/null; sleep 5
contains "Glass Theme Settings window opens" "$(js "global.get_window_actors().map(a => a.meta_window.title).join(',')")" "Glass Theme Settings"
shot 05-settings
lacks "settings window has no script errors" "$(journalctl --user -q --since '-20s' 2>/dev/null | grep -i 'ubuntu-glass' | grep -i 'error' || true)$(grep -i 'JS ERROR' "$HOME/shell.log" | grep -i 'prefs' || true)" "ERROR"

# --- 6. Robustness ------------------------------------------------------------
echo "== robustness"
alive "before robustness"
gset backup "not json"
gset shadows false; gset shadows true
check "survives a corrupt backup record" "$(state)" 1
gset dock-style false; gset dock-style true
check "still manages the dock afterwards" "$(sys $DOCK dock-position)" BOTTOM
glass reset-recursively 2>/dev/null || gsettings --schemadir "$SCHEMAS" reset-recursively org.gnome.shell.extensions.ubuntu-glass
sleep 1
check "survives all settings being reset" "$(state)" 1
# The reset wiped the backup record, so re-seed the dock's original layout.
gset dock-style false
gsettings set $DOCK dock-position LEFT; gsettings set $DOCK extend-height true
gset dock-style true

# --- 7. Disable restores everything -------------------------------------------
echo "== disable"
alive "before disable"
gset wallpaper true; gset icon-theme true; gset appearance dark
gnome-extensions disable "$UUID"; sleep 2
check "extension is inactive" "$(state)" 2
check "dock position restored" "$(sys $DOCK dock-position)" LEFT
check "dock length restored" "$(sys $DOCK extend-height)" true
check "wallpaper restored" "$(sys $BG picture-uri)" "$ORIG_WALL"
check "icon theme restored" "$(sys $IFACE icon-theme)" Yaru
check "system style restored" "$(sys $IFACE color-scheme)" default
check "terminal palette restored" "$(sys "$PROFILE" palette)" Ubuntu
check "terminal opacity restored" "$(sys "$PROFILE" opacity)" 1.0
[ ! -e "$PALETTE_FILE" ] && ok "terminal palette file removed" || fail "terminal palette file removed"
check "backup record is empty" "$(gget backup)" "{}"
check "no blur effects left" "$(blurs)" 0
check "stylesheet unloaded" "$(sheet)" ""
[ ! -e "$HOME/.config/gtk-4.0/ubuntu-glass.css" ] && ok "GTK stylesheet removed" || fail "GTK stylesheet removed"
check "user's gtk.css is back to its original content" "$(cat "$HOME/.config/gtk-4.0/gtk.css")" "window { margin: 0; }"
check "preferences survive a disable" "$(gget wallpaper)" true

gnome-extensions enable "$UUID"; sleep 2
check "re-enable works" "$(state)" 1
contains "re-enable reapplies the wallpaper" "$(sys $BG picture-uri)" "wallpapers/"
gnome-extensions disable "$UUID"; sleep 1.5
gnome-extensions enable "$UUID"; sleep 1.5
gnome-extensions disable "$UUID"; sleep 1.5
check "repeated enable/disable ends clean" "$(gget backup)" "{}"

# --- 8. Uninstall -------------------------------------------------------------
echo "== uninstall"
bash "$REPO/uninstall.sh" --purge >/dev/null 2>&1 && ok "uninstall.sh succeeds" || fail "uninstall.sh"
[ ! -e "$EXT" ] && ok "extension files removed" || fail "extension files removed"
[ ! -e "$HOME/.local/share/icons/Ubuntu-Glass" ] && ok "icon theme removed" || fail "icon theme removed"

# --- 9. Log -------------------------------------------------------------------
echo "== log"
errors="$(grep -E 'JS ERROR|had error|SyntaxError|TypeError|ReferenceError' "$HOME/shell.log" | grep -v -E 'DING|ding@' || true)"
if [ -z "$errors" ]; then ok "no JavaScript errors in the shell log"; else fail "JavaScript errors in the shell log"; echo "$errors" | head -8; fi
warnings="$(grep -c 'Ubuntu Glass:' "$HOME/shell.log" || true)"
echo "note $warnings extension warning(s) logged"
grep 'Ubuntu Glass:' "$HOME/shell.log" | head -5 | sed 's/^/note   /'

kill "$SHELL_PID" 2>/dev/null; wait "$SHELL_PID" 2>/dev/null
echo "== $fails failure(s)"
[ "$fails" -eq 0 ]
