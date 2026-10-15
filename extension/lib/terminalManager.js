// Applies the theme's palette and opacity to the default Ptyxis profile.
//
// The palette is written as its own file in Ptyxis's user palette folder.
// The profile's previous palette and opacity are backed up before they are
// changed and put back when terminal styling is turned off.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {PALETTE_ID} from './css/terminal.js';

const APP_SCHEMA = 'org.gnome.Ptyxis';
const PROFILE_SCHEMA = 'org.gnome.Ptyxis.Profile';
const PROFILE_PATH = '/org/gnome/Ptyxis/Profiles/';

function schemaInstalled(id) {
    return Gio.SettingsSchemaSource.get_default().lookup(id, true) !== null;
}

/**
 * Whether Ptyxis is installed, so terminal styling can work.
 *
 * @returns {boolean}
 */
export function terminalAvailable() {
    return schemaInstalled(APP_SCHEMA) && schemaInstalled(PROFILE_SCHEMA);
}

export class TerminalManager {
    /**
     * @param {Backup} backup - store for the profile's previous values
     */
    constructor(backup) {
        this._backup = backup;
        this._app = terminalAvailable() ? new Gio.Settings({schema_id: APP_SCHEMA}) : null;
        this._paletteFile = GLib.build_filenamev([
            GLib.get_user_data_dir(), 'org.gnome.Ptyxis', 'palettes', `${PALETTE_ID}.palette`]);
    }

    /** @returns {boolean} whether a supported terminal is installed */
    get available() {
        return this._app !== null;
    }

    _profile() {
        const uuid = this._app?.get_string('default-profile-uuid');
        if (!uuid)
            return null;
        return new Gio.Settings({schema_id: PROFILE_SCHEMA, path: `${PROFILE_PATH}${uuid}/`});
    }

    _writePalette(text) {
        try {
            const [ok, bytes] = GLib.file_get_contents(this._paletteFile);
            if (ok && new TextDecoder().decode(bytes) === text)
                return;
        } catch {
            // Not written yet.
        }
        GLib.mkdir_with_parents(GLib.path_get_dirname(this._paletteFile), 0o755);
        Gio.File.new_for_path(this._paletteFile).replace_contents(new TextEncoder().encode(text),
            null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    }

    /**
     * @param {object|null} style - `{palette, opacity}` to apply, or null to
     *   restore the profile and remove the palette file
     */
    sync(style) {
        if (!this._app)
            return;
        const profile = this._profile();

        try {
            if (style) {
                this._writePalette(style.palette);
                if (!profile)
                    return;
                this._backup.saveSetting('terminal:palette', profile, 'palette');
                this._backup.saveSetting('terminal:opacity', profile, 'opacity');
                if (profile.get_string('palette') !== PALETTE_ID)
                    profile.set_string('palette', PALETTE_ID);
                if (Math.abs(profile.get_double('opacity') - style.opacity) > 0.001)
                    profile.set_double('opacity', style.opacity);
                return;
            }

            if (profile) {
                this._backup.restoreSetting('terminal:palette', profile, 'palette');
                this._backup.restoreSetting('terminal:opacity', profile, 'opacity');
            }
            if (GLib.file_test(this._paletteFile, GLib.FileTest.EXISTS))
                GLib.unlink(this._paletteFile);
        } catch (e) {
            console.warn(`Ubuntu Glass: could not update the terminal profile: ${e.message}`);
        }
    }

    destroy() {
        this.sync(null);
        this._app = null;
    }
}
