// Loads the generated stylesheet into the shell theme and swaps it when the
// settings change.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

export class StyleManager {
    constructor() {
        this._dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'ubuntu-glass']);
        this._loaded = null;
        this._flip = false;
    }

    _theme() {
        return St.ThemeContext.get_for_stage(global.stage).get_theme();
    }

    /**
     * Replace the loaded stylesheet.
     *
     * @param {string} css - stylesheet text; empty unloads everything
     */
    apply(css) {
        const previous = this._loaded;
        this._loaded = null;

        if (css) {
            // Alternate between two files so the theme never treats the new
            // sheet as one it has already parsed.
            this._flip = !this._flip;
            const file = Gio.File.new_for_path(
                GLib.build_filenamev([this._dir, this._flip ? 'shell-a.css' : 'shell-b.css']));
            try {
                GLib.mkdir_with_parents(this._dir, 0o700);
                file.replace_contents(new TextEncoder().encode(css), null, false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION, null);
                this._theme().load_stylesheet(file);
                this._loaded = file;
            } catch (e) {
                console.error(`Ubuntu Glass: could not load stylesheet: ${e.message}`);
            }
        }

        if (previous)
            this._theme().unload_stylesheet(previous);
    }

    destroy() {
        this.apply('');
    }
}
