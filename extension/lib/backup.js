// Remembers the value a system setting had before the theme changed it, so
// the change can be undone later.
//
// Records live in the extension's own `backup` key as JSON. A value is only
// recorded once: if the shell exits without disabling the extension, the next
// session still knows the user's original value rather than the theme's.

import GLib from 'gi://GLib';

export class Backup {
    /**
     * @param {Gio.Settings} settings - the extension's settings
     */
    constructor(settings) {
        this._settings = settings;
    }

    _read() {
        try {
            const data = JSON.parse(this._settings.get_string('backup'));
            return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        } catch {
            return {};
        }
    }

    _write(data) {
        this._settings.set_string('backup', JSON.stringify(data));
    }

    /**
     * @param {string} id - record name
     * @returns {boolean} whether a value is recorded under `id`
     */
    has(id) {
        return Object.hasOwn(this._read(), id);
    }

    /**
     * Record a string, unless something is already recorded under `id`.
     *
     * @param {string} id - record name
     * @param {string} text - value to remember
     */
    save(id, text) {
        const data = this._read();
        if (Object.hasOwn(data, id))
            return;
        data[id] = text;
        this._write(data);
    }

    /**
     * Return a record and forget it.
     *
     * @param {string} id - record name
     * @returns {string|null} the recorded string, or null
     */
    take(id) {
        const data = this._read();
        if (!Object.hasOwn(data, id))
            return null;
        const text = data[id];
        delete data[id];
        this._write(data);
        return typeof text === 'string' ? text : null;
    }

    /**
     * Forget a record without restoring it.
     *
     * @param {string} id - record name
     */
    drop(id) {
        this.take(id);
    }

    /**
     * Record the current value of a GSettings key.
     *
     * @param {string} id - record name
     * @param {Gio.Settings} gsettings - settings object that owns the key
     * @param {string} key - key name
     */
    saveSetting(id, gsettings, key) {
        this.save(id, gsettings.get_value(key).print(true));
    }

    /**
     * Put a recorded GSettings value back and forget the record.
     *
     * @param {string} id - record name
     * @param {Gio.Settings} gsettings - settings object that owns the key
     * @param {string} key - key name
     * @returns {boolean} whether a value was restored
     */
    restoreSetting(id, gsettings, key) {
        const text = this.take(id);
        if (text === null)
            return false;
        try {
            const type = gsettings.get_value(key).get_type();
            gsettings.set_value(key, GLib.Variant.parse(type, text, null, null));
            return true;
        } catch (e) {
            console.warn(`Ubuntu Glass: could not restore ${key}: ${e.message}`);
            return false;
        }
    }
}
