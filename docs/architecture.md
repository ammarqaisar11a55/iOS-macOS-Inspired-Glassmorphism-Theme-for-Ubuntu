# Architecture

Ubuntu Glass is one GNOME Shell extension plus two generated asset sets. This page explains how the pieces fit, for anyone changing the code.

## Data flow

```
GSettings (schemas/…gschema.xml)
        │  read by
        ▼
lib/model.js ── keys, validation, presets, import/export
        │
        ▼
extension.js ── reacts to each changed key
        │
        ├── lib/css/index.js ──► lib/styleManager.js   shell stylesheet
        │        ▲
        │   lib/tokens.js   design tokens resolved from the settings
        │
        ├── lib/css/gtk.js ────► lib/gtkManager.js     GTK stylesheets
        ├── lib/blurManager.js                         blur on top bar and dock
        ├── lib/dockManager.js ─┐
        ├── lib/desktopManager.js ├─► lib/backup.js    previous values
        └── lib/indicator.js                           Quick Settings tile
```

`prefs.js` runs in a separate process. It only reads and writes GSettings through `lib/model.js`; it never talks to the shell directly. That is why every control in Glass Theme Settings works the same whether it is changed from the window, the Quick Settings tile, `gsettings`, or an imported file.

## Design tokens

`lib/tokens.js` holds the values from the approved mockup: the dark and light palettes, the five accents, the four glass materials with their solid fallbacks, the radius scale, the shadow scale and the motion durations.

`resolveTokens(options)` turns one combination of settings into a concrete token set. The switches map onto it like this:

| Setting | Effect on tokens |
|---|---|
| Glassmorphism effects off | Every surface becomes its solid fallback colour |
| Glass intensity | Alpha moves from the designed value (100) to opaque (0), and the colour drifts to the fallback as it closes |
| Transparency off | Surface alpha is raised to at least 0.96 |
| Glass borders off | Edge colours become fully transparent; the 1 px border stays so layout does not shift |
| Shadows off | All four elevation shadows become `none` |
| Rounded corners off | The radius scale is replaced by a small uniform one |
| Reduced motion | All durations become 0 |
| High contrast | Edges at 0.32, secondary text at full strength, surface alpha at least 0.92 |

The module has no GNOME imports, so the shell, the preferences window and the test runner all use the same code.

## Stylesheets

GNOME Shell's CSS has no variables, so a static stylesheet cannot respond to settings. Instead, each file in `lib/css/` is a function from tokens to CSS text for one component, and `lib/css/index.js` joins the ones whose switch is on.

`lib/styleManager.js` writes the result to `~/.cache/ubuntu-glass/` and loads it into the shell theme as a custom stylesheet, on top of Yaru. It alternates between two file names so the theme never mistakes a new sheet for one it has already parsed.

Rules are written to match the specificity of the Yaru rules they override. Where Yaru uses `!important` (the top bar colour, menu item hover), so does the generated sheet.

Rebuilds are debounced by 40 ms, so dragging a slider or applying a preset produces one rebuild.

## Changing settings that belong to the user

The dock layout, wallpaper, icon theme and system style are ordinary GNOME settings. The rule for all of them is the same:

1. Before the first write, record the current value in the extension's `backup` key (`lib/backup.js`).
2. Never overwrite an existing record. If the shell exits without disabling the extension, the record still holds the user's value, not the theme's.
3. When the switch is turned off, or the extension is disabled, write the recorded value back and delete the record.

GTK stylesheets follow the same idea with files: the theme writes its own `ubuntu-glass.css` and adds a single `@import` line to the user's `gtk.css`. Undoing it means removing that one line and that one file.

## Blur

`lib/blurManager.js` attaches `Shell.BlurEffect` in background mode to two actors the shell already owns: the top bar and the dock's background. Docks are rebuilt whenever their settings or the monitors change, so the manager rescans on `child-added` and on dock setting changes, and forgets an actor when it is destroyed.

The effect is rectangular. That is fine for the top bar and nearly invisible on the dock, and it is the reason menus and popovers are not blurred (see the README's limitations).

## Symbolic icons

GNOME draws symbolic icons (the small one-colour icons in the top bar, Quick Settings, menus and header bars) by recolouring their *fill* to the text colour. The design's glyphs are Lucide outlines, which are *strokes*, and a stroke would stay black or turn into a filled blob.

`tools/stroke_outline.py` converts each stroke into the filled shape it would paint: smooth stretches become one continuous outline, sharp corners get a round join, and curves tighter than the stroke fall back to overlapping pieces. All pieces are wound the same way so the non-zero fill rule draws their union. It uses only the Python standard library.

The designs themselves are data in `tools/symbolic_icons.py`: a list of layers per icon, where a layer can be dimmed (signal and volume levels) or tagged `error` or `warning` so GNOME colours it. `tools/build-icons.py` renders them into `icons/Ubuntu-Glass/symbolic/`, and `tests/test_icons.py` checks that no stroke survives.

## Session modes

The extension declares `unlock-dialog` as well as `user`. Without it, GNOME would disable the extension every time the screen locks, which would restore the wallpaper, move the dock and rewrite the GTK stylesheets on every lock, and show the old wallpaper on the lock screen. On the lock screen the extension does only two things differently: the top bar is not blurred, and the Glass tile's link to the settings window is hidden.

## Adding a setting

1. Add the key to `schemas/org.gnome.shell.extensions.ubuntu-glass.gschema.xml`.
2. Add it to `KEYS` in `lib/model.js`, and to `STYLE_KEYS` if it changes the stylesheet. `tests/run.js` fails if the two files disagree, or if a style key has no effect on the generated CSS.
3. Use it: in `tokenOptions` for a token change, or in `extension.js` `_onChanged` for a manager.
4. Add a row in `prefs.js`.
5. Add a check to `tests/headless-session.sh` for its observable effect.

## Adding a component

1. Write `lib/css/<name>.js` exporting a function from tokens to CSS.
2. Add a `<name>-style` key (see above) and include the builder in `lib/css/index.js`.
3. Add the section marker to `COMPONENT_MARKERS` in `tests/run.js`.
