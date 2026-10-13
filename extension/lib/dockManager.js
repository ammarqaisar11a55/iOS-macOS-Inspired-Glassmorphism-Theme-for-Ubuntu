// Puts Ubuntu Dock / Dash to Dock into the floating layout the design needs,
// and puts it back afterwards.
//
// Only layout keys are written. Colours, borders and radii come from the
// generated stylesheet, so the dock's own theming options are switched to
// their neutral values to keep it from overriding them inline.

import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const DOCK_SCHEMA = 'org.gnome.shell.extensions.dash-to-dock';
const DOCK_UUIDS = ['ubuntu-dock@ubuntu.com', 'dash-to-dock@micxgx.gmail.com'];

// What "Floating glass dock" writes.
const LAYOUT = {
    'dock-position': 'BOTTOM',
    'extend-height': false,
    'transparency-mode': 'DEFAULT',
    'custom-background-color': false,
    'apply-custom-theme': false,
};

// What switching dock animations off writes.
const NO_ANIMATION = {
    'animation-time': 0.0,
};

function lookupDockSettings() {
    const system = Gio.SettingsSchemaSource.get_default().lookup(DOCK_SCHEMA, true);
    if (system)
        return new Gio.Settings({settings_schema: system});

    // A dock installed per-user keeps its schema inside its own directory.
    for (const uuid of DOCK_UUIDS) {
        const ext = Main.extensionManager.lookup(uuid);
        const dir = ext?.dir?.get_child('schemas');
        if (!dir?.query_exists(null))
            continue;
        try {
            const source = Gio.SettingsSchemaSource.new_from_directory(
                dir.get_path(), Gio.SettingsSchemaSource.get_default(), false);
            const schema = source.lookup(DOCK_SCHEMA, false);
            if (schema)
                return new Gio.Settings({settings_schema: schema});
        } catch {
            // Not compiled or unreadable: treat as not installed.
        }
    }
    return null;
}

export class DockManager {
    /**
     * @param {Backup} backup - store for the dock's previous values
     */
    constructor(backup) {
        this._backup = backup;
        this._settings = lookupDockSettings();
    }

    /** @returns {boolean} whether a supported dock is installed */
    get available() {
        return this._settings !== null;
    }

    /** @returns {Gio.Settings|null} the dock's settings, for change tracking */
    get settings() {
        return this._settings;
    }

    _set(key, value) {
        if (!this._settings.settings_schema.has_key(key))
            return;
        this._backup.saveSetting(`dock:${key}`, this._settings, key);
        if (typeof value === 'boolean')
            this._settings.set_boolean(key, value);
        else if (typeof value === 'number')
            this._settings.set_double(key, value);
        else
            this._settings.set_string(key, value);
    }

    _restore(keys) {
        for (const key of keys) {
            if (this._settings.settings_schema.has_key(key))
                this._backup.restoreSetting(`dock:${key}`, this._settings, key);
        }
    }

    /**
     * @param {object} state
     * @param {boolean} state.floating - whether the floating layout is wanted
     * @param {boolean} state.animations - whether dock animations are wanted
     */
    sync({floating, animations}) {
        if (!this._settings)
            return;

        if (floating) {
            for (const [key, value] of Object.entries(LAYOUT))
                this._set(key, value);
        } else {
            this._restore(Object.keys(LAYOUT));
        }

        if (floating && !animations) {
            for (const [key, value] of Object.entries(NO_ANIMATION))
                this._set(key, value);
        } else {
            this._restore(Object.keys(NO_ANIMATION));
        }
    }

    destroy() {
        this.sync({floating: false, animations: true});
        this._settings = null;
    }
}
