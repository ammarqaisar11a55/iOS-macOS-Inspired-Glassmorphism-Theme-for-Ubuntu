// Installs the GTK stylesheets into the user's GTK configuration.
//
// The theme never edits the body of the user's gtk.css. It writes its own
// file next to it and adds a single @import line, which is all that has to
// be removed to undo the change.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const FILE_NAME = 'ubuntu-glass.css';
const IMPORT_LINE = `@import url("${FILE_NAME}"); /* Ubuntu Glass */`;

function read(path) {
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        return ok ? new TextDecoder().decode(bytes) : null;
    } catch {
        return null;
    }
}

function write(path, text) {
    GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
    Gio.File.new_for_path(path).replace_contents(new TextEncoder().encode(text), null, false,
        Gio.FileCreateFlags.REPLACE_DESTINATION, null);
}

function withoutImport(text) {
    return text.split('\n').filter(line => line.trim() !== IMPORT_LINE).join('\n');
}

export class GtkManager {
    constructor() {
        this._config = GLib.get_user_config_dir();
    }

    _paths(version) {
        const dir = GLib.build_filenamev([this._config, `gtk-${version}`]);
        return {
            ours: GLib.build_filenamev([dir, FILE_NAME]),
            user: GLib.build_filenamev([dir, 'gtk.css']),
        };
    }

    _install(version, css) {
        const {ours, user} = this._paths(version);
        if (read(ours) !== css)
            write(ours, css);

        // @import must come before any other rule, so the line goes first.
        const existing = read(user) ?? '';
        if (!existing.split('\n').some(line => line.trim() === IMPORT_LINE))
            write(user, existing ? `${IMPORT_LINE}\n${existing}` : `${IMPORT_LINE}\n`);
    }

    _remove(version) {
        const {ours, user} = this._paths(version);
        const existing = read(user);
        if (existing !== null && existing.includes(IMPORT_LINE)) {
            const rest = withoutImport(existing);
            if (rest.trim() === '')
                GLib.unlink(user);
            else
                write(user, rest);
        }
        if (GLib.file_test(ours, GLib.FileTest.EXISTS))
            GLib.unlink(ours);
    }

    /**
     * @param {object|null} sheets - `{gtk4, gtk3}` CSS, or null to uninstall
     */
    sync(sheets) {
        for (const [version, css] of [['4.0', sheets?.gtk4], ['3.0', sheets?.gtk3]]) {
            try {
                if (css)
                    this._install(version, css);
                else
                    this._remove(version);
            } catch (e) {
                console.warn(`Ubuntu Glass: could not update the GTK ${version} stylesheet: ${e.message}`);
            }
        }
    }

    destroy() {
        this.sync(null);
    }
}
