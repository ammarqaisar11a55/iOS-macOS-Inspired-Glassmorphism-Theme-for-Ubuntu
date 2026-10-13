// Wallpaper, icon theme and appearance mode. These are ordinary GNOME
// settings that belong to the user, so each one is backed up before it is
// changed and restored when its switch is turned off.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const ICON_THEME = 'Ubuntu-Glass';

const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const WALLPAPER_KEYS = ['picture-uri', 'picture-uri-dark', 'picture-options'];

// GNOME's named accents (GNOME 47 and later).
const SYSTEM_ACCENTS = {
    blue: '#3584e4',
    teal: '#2190a4',
    green: '#3a944a',
    yellow: '#c88800',
    orange: '#ed5b00',
    red: '#e62d42',
    pink: '#d56199',
    purple: '#9141ac',
    slate: '#6f8396',
};

/**
 * Whether the Ubuntu-Glass icon theme can be found on this system.
 *
 * @returns {boolean}
 */
export function iconThemeInstalled() {
    const dirs = [
        GLib.build_filenamev([GLib.get_user_data_dir(), 'icons']),
        GLib.build_filenamev([GLib.get_home_dir(), '.icons']),
        ...GLib.get_system_data_dirs().map(d => GLib.build_filenamev([d, 'icons'])),
    ];
    return dirs.some(d => GLib.file_test(
        GLib.build_filenamev([d, ICON_THEME, 'index.theme']), GLib.FileTest.EXISTS));
}

export class DesktopManager {
    /**
     * @param {Backup} backup - store for previous values
     * @param {Gio.Settings} iface - org.gnome.desktop.interface
     * @param {string} extensionPath - directory the wallpapers ship in
     */
    constructor(backup, iface, extensionPath) {
        this._backup = backup;
        this._iface = iface;
        this._path = extensionPath;
        this._background = new Gio.Settings({schema_id: BACKGROUND_SCHEMA});
        // Set while this object writes color-scheme itself, so the change is
        // not mistaken for the user changing it.
        this._writing = false;
    }

    /** @returns {'dark'|'light'} the style GNOME is currently using */
    get systemMode() {
        return this._iface.get_string('color-scheme') === 'prefer-dark' ? 'dark' : 'light';
    }

    /** @returns {string|null} GNOME's accent as #RRGGBB, when it has one */
    get systemAccent() {
        if (!this._iface.settings_schema.has_key('accent-color'))
            return null;
        return SYSTEM_ACCENTS[this._iface.get_string('accent-color')] ?? null;
    }

    /** @returns {boolean} GNOME's global animation switch */
    get systemAnimations() {
        return this._iface.get_boolean('enable-animations');
    }

    /** @returns {boolean} true while a color-scheme write of ours is in flight */
    get writingScheme() {
        return this._writing;
    }

    _wallpaperUri(name, mode) {
        const path = GLib.build_filenamev([this._path, 'wallpapers', `${name}-${mode}.svg`]);
        return GLib.file_test(path, GLib.FileTest.EXISTS) ? GLib.filename_to_uri(path, null) : null;
    }

    /**
     * @param {boolean} enabled - whether a theme wallpaper is wanted
     * @param {string} name - wallpaper id
     */
    syncWallpaper(enabled, name) {
        const light = enabled ? this._wallpaperUri(name, 'light') : null;
        const dark = enabled ? this._wallpaperUri(name, 'dark') : null;

        if (!light || !dark) {
            if (enabled)
                console.warn(`Ubuntu Glass: wallpaper "${name}" is missing; leaving the wallpaper alone`);
            for (const key of WALLPAPER_KEYS)
                this._backup.restoreSetting(`wallpaper:${key}`, this._background, key);
            return;
        }

        for (const key of WALLPAPER_KEYS)
            this._backup.saveSetting(`wallpaper:${key}`, this._background, key);
        this._background.set_string('picture-uri', light);
        this._background.set_string('picture-uri-dark', dark);
        this._background.set_string('picture-options', 'zoom');
    }

    /**
     * @param {boolean} enabled - whether the theme's icons are wanted
     */
    syncIconTheme(enabled) {
        if (enabled && iconThemeInstalled()) {
            this._backup.saveSetting('icons:icon-theme', this._iface, 'icon-theme');
            if (this._iface.get_string('icon-theme') !== ICON_THEME)
                this._iface.set_string('icon-theme', ICON_THEME);
            return;
        }
        if (enabled)
            console.warn('Ubuntu Glass: the icon theme is not installed; leaving icons alone');
        this._backup.restoreSetting('icons:icon-theme', this._iface, 'icon-theme');
    }

    /**
     * @param {'system'|'dark'|'light'} appearance - requested mode
     */
    syncAppearance(appearance) {
        this._writing = true;
        try {
            if (appearance === 'system') {
                this._backup.restoreSetting('appearance:color-scheme', this._iface, 'color-scheme');
                return;
            }
            const wanted = appearance === 'dark' ? 'prefer-dark' : 'default';
            this._backup.saveSetting('appearance:color-scheme', this._iface, 'color-scheme');
            if (this.systemMode !== appearance)
                this._iface.set_string('color-scheme', wanted);
        } finally {
            this._writing = false;
        }
    }

    /**
     * The user changed the system style themselves: keep their choice and
     * stop remembering the older one.
     */
    forgetAppearance() {
        this._backup.drop('appearance:color-scheme');
    }

    destroy() {
        this.syncWallpaper(false, '');
        this.syncIconTheme(false);
        this.syncAppearance('system');
        this._background = null;
    }
}
