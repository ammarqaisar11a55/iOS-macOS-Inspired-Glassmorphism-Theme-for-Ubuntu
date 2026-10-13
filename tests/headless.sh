#!/usr/bin/env bash
# Integration test: runs the extension in a throwaway headless GNOME Shell.
#
# The shell gets its own HOME, runtime directory and D-Bus session, so it
# cannot see or change your real desktop, settings or files. It installs the
# extension with install.sh, exercises every setting, checks the observable
# effect of each one, then disables the extension and checks that everything
# it changed was put back.
#
#   tests/headless.sh                 run the checks
#   tests/headless.sh --shots DIR     also save screenshots to DIR
#   GLASS_TEST_KEEP=1 tests/headless.sh   keep the sandbox afterwards
#
# Requires: gnome-shell, dbus-run-session, gdbus, gsettings.

set -uo pipefail

UUID="ubuntu-glass@ammarqaisar11a55.github.io"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHOTS=""
[ "${1:-}" = "--shots" ] && { SHOTS="$(mkdir -p "$2" && cd "$2" && pwd)"; }

run_session() {
    WORK="$(mktemp -d "${TMPDIR:-/tmp}/glass-test.XXXXXX")"
    # Wayland socket paths are limited to 108 bytes, so keep the runtime dir short.
    RUNTIME="/run/user/$(id -u)/glass-test-$$"
    mkdir -p "$WORK/home" "$RUNTIME" && chmod 700 "$RUNTIME"
    export UUID REPO SHOTS WORK
    setsid --wait bash -c 'echo $$ > "$WORK/sid"; exec "$@"' _ \
        env -u WAYLAND_DISPLAY -u DISPLAY -u DBUS_SESSION_BUS_ADDRESS \
        HOME="$WORK/home" XDG_RUNTIME_DIR="$RUNTIME" \
        XDG_CONFIG_HOME="$WORK/home/.config" XDG_DATA_HOME="$WORK/home/.local/share" \
        XDG_CACHE_HOME="$WORK/home/.cache" \
        XDG_CURRENT_DESKTOP=ubuntu:GNOME XDG_SESSION_TYPE=wayland GNOME_SHELL_SESSION_MODE=ubuntu \
        timeout 240 dbus-run-session -- bash "$REPO/tests/headless-session.sh" > "$WORK/out.log" 2>&1
}

cleanup() {
    [ -n "${WORK:-}" ] || return 0
    [ -f "$WORK/sid" ] && pkill -9 -s "$(cat "$WORK/sid")" 2>/dev/null
    # The session's file services leave FUSE mounts in its runtime directory.
    for mount in "$RUNTIME/gvfs" "$RUNTIME/doc"; do
        mountpoint -q "$mount" 2>/dev/null && fusermount -uz "$mount" 2>/dev/null
    done
    # Set GLASS_TEST_KEEP=1 to keep the sandbox (and its shell.log) for debugging.
    if [ -n "${GLASS_TEST_KEEP:-}" ]; then
        echo "note sandbox kept at $WORK"
        rm -rf "$RUNTIME"
    else
        rm -rf "$WORK" "$RUNTIME"
    fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

run_session
status=$?

# Occasionally the sandboxed shell comes up with no extensions switched on at
# all, so the test's own helper never enables Eval. That is the sandbox, not
# the theme; start a fresh one once.
if grep -q '^FAIL shell stopped responding during startup' "$WORK/out.log" &&
   grep -q "^note   Eval answered: (false" "$WORK/out.log"; then
    echo "note sandbox started without extensions; retrying once"
    cleanup
    run_session
    status=$?
fi

grep -E '^(ok|FAIL|note|==)' "$WORK/out.log"
if grep -q '^FAIL' "$WORK/out.log" || [ "$status" -ne 0 ]; then
    echo "== last lines of the session log"
    grep -v -E '^(ok|FAIL|note|==)' "$WORK/out.log" | tail -15
    exit 1
fi
