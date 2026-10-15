# Testing

## Status

| What | Result |
|---|---|
| Unit tests (`tests/run.js`) | 30 of 30 pass |
| Integration test (`tests/headless.sh`) | 124 of 124 checks pass. 13 consecutive clean runs of the earlier 111-check version; the terminal and icon checks were added afterwards |
| Open issue | An intermittent shell freeze seen earlier in development, cause not identified. See below. |
| Tested on | Ubuntu 26.04.1 LTS, GNOME Shell 50.1, Wayland, Intel graphics |
| Not tested | GNOME Shell 46 to 49, a real (non-sandboxed) desktop session, X11, multiple monitors, HiDPI scaling |

**Everything here was run in an isolated, headless GNOME Shell, not in a live desktop session.** The sandbox uses the real GNOME Shell, Ubuntu Dock and Yaru theme, so the results are meaningful, but nobody has yet logged in and used the theme for a day.

## Open issue: intermittent freeze

During development the sandboxed shell stopped responding in about 3 of the first 40 full integration runs. Each time it happened at the same point: just after the theme wallpaper was switched on for the second time, as the first preset was about to be applied. The shell's main loop was blocked and using CPU.

What is known:

- It did not occur in seven runs of the same sandbox without the extension enabled.
- It could not be reproduced on purpose: over 100 targeted repetitions of the surrounding steps (wallpaper, accent, presets, appearance, icon theme, dock, blur and glass toggles) ran clean.
- It never occurred while the shell was running under a debugger (about 18 runs), so no stack trace was captured.
- After the theme's shadows were changed from very wide blurs (up to 64 px) to compact ones, 13 full runs in a row passed. GNOME Shell blurs shadows on the CPU, so wide shadows are a plausible cause, but 13 clean runs is not proof: at the earlier rate, a clean streak that long would happen by chance roughly a third of the time.

Treat it as unresolved. If the desktop ever stops responding with the theme on, switch to a text console (Ctrl+Alt+F3), log in, and run:

```bash
gsettings set org.gnome.shell disable-user-extensions true
```

Then please report what you were doing, especially whether a wallpaper or preset had just been changed.

## Unit tests

```bash
gjs -m tests/run.js
```

Covers the modules that have no GNOME Shell dependencies:

- **Settings model.** The schema and the model agree on every key and default. Invalid values are rejected or clamped. Each preset is recognised from its own values, and no preset touches wallpaper, icons, accent, appearance mode or component switches. Export and import round-trip; foreign, malformed and partly invalid files are handled.
- **Tokens.** The mockup's colour values are reproduced exactly at full intensity. Glass off, transparency off, intensity, borders, shadows, rounded corners, reduced motion and high contrast each change the tokens as documented. Primary text keeps a contrast ratio of at least 4.5:1 on elevated and window surfaces against the worst possible backdrop, and accent ink is readable on every accent in both modes.
- **Terminal.** The palette has both variants with all 16 colours, the cursor follows the accent, and opacity follows glass, intensity and transparency.
- **Stylesheets.** Output is well formed for every preset, mode and accent (60 combinations). Each component switch removes its own section and no other. Every key that is supposed to affect the stylesheet does. Reduced motion leaves no transition behind.

## Integration test

```bash
tests/headless.sh                 # run the checks
tests/headless.sh --shots DIR     # also save screenshots
GLASS_TEST_KEEP=1 tests/headless.sh   # keep the sandbox and its shell log
```

Starts a second GNOME Shell with its own home directory, runtime directory and D-Bus session, with no window on your screen. It cannot read or change your real settings or files. It takes about 80 seconds.

What it checks, in order:

| Area | Checks |
|---|---|
| Install | `install.sh` succeeds; schema compiled; icon theme installed |
| Enable | Extension active; stylesheet loaded; dock moved and its old layout backed up; top bar and dock blurred; GTK stylesheets written with the user's existing `gtk.css` content kept; terminal palette written and applied to the default profile; folder and file icons installed; wallpaper and icons untouched by default |
| Components | Each of the seven shell components, switched off, removes its own rules and leaves the other six; switched on, restores them. Dock layout, GTK stylesheets and the terminal palette are removed and restored by their switches |
| Appearance | Blur on/off and intensity; glass on/off; transparency; glass intensity; borders; shadows; rounded corners; accent; reduced motion (including the dock's animation time); high contrast |
| Light and dark | Forcing a mode switches the system style and restores it; the theme follows a system change; a manual system change overrides a forced mode |
| Desktop | Wallpaper applied for both modes, changed, and restored; icon theme applied and restored; Glass tile shown and hidden |
| Presets | Manual changes become Custom and return to the preset when matched; each of the five presets applies its values and leaves wallpaper and accent alone |
| Interface | Glass tile present in Quick Settings; Glass Theme Settings window opens without script errors |
| Robustness | A corrupt backup record and a full settings reset are both survived |
| Disable | Dock, wallpaper, icon theme, system style, GTK files and terminal profile all restored; backup record empty; no blur effects or stylesheet left; preferences kept; repeated enable/disable ends clean |
| Uninstall | `uninstall.sh --purge` succeeds and removes the files |
| Log | No JavaScript errors in the shell log |

The sandbox itself sometimes starts with no extensions switched on, which stops the test's own helper from working. The script detects that case and starts a fresh sandbox once. It is unrelated to the theme.

## Mapping to the test plan

| Requirement | Covered by | Status |
|---|---|---|
| Installation with the documented procedure | Integration: install | Pass, in the sandbox |
| Enabling and disabling the theme | Integration: enable, disable | Pass |
| Opening the customization menu | Integration: interface | Pass |
| Toggling each feature independently | Integration: components, appearance, desktop | Pass |
| Switching light and dark | Integration: light and dark | Pass |
| Saving and restoring preferences | Unit: export/import; integration: preferences survive disable | Pass. The file dialogs themselves were not driven |
| Applying and resetting presets | Unit and integration: presets | Pass. The Restore Defaults button was not clicked; the function it calls is exercised by the settings-reset check |
| Invalid or missing settings | Unit: sanitize, import; integration: robustness | Pass |
| Reloading the shell, or logging out and in | Integration: a fresh shell start loads the extension with stored settings | Partly. A real logout and login was not done |
| Disabling and removing the extension | Integration: disable, uninstall | Pass |
| Existing preferences preserved | Integration: disable | Pass |
| Readability | Unit: contrast checks | Computed, not measured on screen |
| Keyboard accessibility | — | **Not tested.** Focus rings are defined for every interactive element, but nothing was navigated by keyboard |
| Extension errors in logs | Integration: log | Pass |
| Performance in normal use | — | **Not tested.** See the open issue above |

## Not verified

- The terminal in the sandbox: it has no systemd user session, so Ptyxis applies the palette and translucency but cannot start a shell there. The terminal was checked on a real desktop instead (see the README screenshot).
- Folder glyphs for Documents, Downloads and the other special folders in a real home; the sandbox has no XDG user-directory configuration, so only Desktop showed its glyph.
- Appearance and behaviour on the lock screen.
- Whether running GTK 4 applications follow a light/dark switch without a restart.
- The GTK 3 stylesheet in a real GTK 3 application.
- Dash to Dock installed per-user (only the system Ubuntu Dock was present).
- Behaviour with other extensions that restyle the shell, such as Blur my Shell.
