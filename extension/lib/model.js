// The settings model: every preference the theme owns, its type, default and
// allowed values, plus presets and import/export.
//
// Pure JavaScript with no GNOME imports. The GSettings schema is the storage;
// this module is the single place that knows what the keys mean, and
// tests/run.js checks the two stay in step.

export const SCHEMA_ID = 'org.gnome.shell.extensions.ubuntu-glass';

const bool = def => ({type: 'b', default: def});
const int = (def, min, max) => ({type: 'i', default: def, min, max});
const choice = (def, values) => ({type: 'enum', default: def, values});

/** Every user-facing key. `backup` is internal and deliberately absent. */
export const KEYS = Object.freeze({
    'glass-effects': bool(true),
    'background-blur': bool(true),
    'transparency': bool(true),
    'glass-borders': bool(true),
    'shadows': bool(true),
    'rounded-corners': bool(true),
    'glass-intensity': int(100, 0, 100),
    'blur-intensity': int(100, 0, 100),
    'accent': choice('orange', ['orange', 'blue', 'sage', 'aubergine', 'graphite', 'system']),
    'appearance': choice('system', ['system', 'dark', 'light']),
    'panel-style': bool(true),
    'dock-style': bool(true),
    'dock-animations': bool(true),
    'quick-settings-style': bool(true),
    'notifications-style': bool(true),
    'menus-style': bool(true),
    'dialogs-style': bool(true),
    'overview-style': bool(true),
    'window-style': bool(true),
    'icon-theme': bool(false),
    'wallpaper': bool(false),
    'wallpaper-name': choice('ember', ['ember', 'dusk', 'tide', 'graphite']),
    'reduced-motion': bool(false),
    'high-contrast': bool(false),
    'show-indicator': bool(true),
    'preset': choice('full', ['custom', 'full', 'balanced', 'minimal', 'performance', 'accessibility']),
});

/** Keys that change what the generated shell stylesheet looks like. */
export const STYLE_KEYS = Object.freeze([
    'glass-effects', 'transparency', 'glass-borders', 'shadows',
    'rounded-corners', 'glass-intensity', 'accent', 'appearance',
    'panel-style', 'dock-style', 'dock-animations', 'quick-settings-style',
    'notifications-style', 'menus-style', 'dialogs-style', 'overview-style',
    'reduced-motion', 'high-contrast',
]);

/** Component switches, used by "enable all" and by the stylesheet builder. */
export const COMPONENT_KEYS = Object.freeze([
    'panel-style', 'dock-style', 'quick-settings-style', 'notifications-style',
    'menus-style', 'dialogs-style', 'overview-style', 'window-style',
]);

// Presets only describe the look of the glass. They never touch wallpaper,
// icons, accent, appearance mode or which components are styled.
const PRESET_KEYS = Object.freeze([
    'glass-effects', 'background-blur', 'transparency', 'glass-borders',
    'shadows', 'rounded-corners', 'glass-intensity', 'blur-intensity',
    'dock-animations', 'reduced-motion', 'high-contrast',
]);

const preset = (title, description, values) => Object.freeze({
    title,
    description,
    values: Object.freeze({
        'glass-effects': true,
        'background-blur': true,
        'transparency': true,
        'glass-borders': true,
        'shadows': true,
        'rounded-corners': true,
        'glass-intensity': 100,
        'blur-intensity': 100,
        'dock-animations': true,
        'reduced-motion': false,
        'high-contrast': false,
        ...values,
    }),
});

export const PRESETS = Object.freeze({
    full: preset('Full Glass', 'The complete approved design.', {}),
    balanced: preset('Balanced', 'Moderate transparency and blur.', {
        'glass-intensity': 60,
        'blur-intensity': 60,
    }),
    minimal: preset('Minimal', 'Mostly opaque surfaces with restrained effects.', {
        'background-blur': false,
        'glass-intensity': 20,
        'blur-intensity': 0,
    }),
    performance: preset('Performance', 'No blur, shadows or animation.', {
        'background-blur': false,
        'shadows': false,
        'glass-intensity': 40,
        'blur-intensity': 0,
        'dock-animations': false,
        'reduced-motion': true,
    }),
    accessibility: preset('Accessibility', 'Solid surfaces, strong edges, reduced motion.', {
        'glass-effects': false,
        'background-blur': false,
        'transparency': false,
        'glass-intensity': 0,
        'blur-intensity': 0,
        'dock-animations': false,
        'reduced-motion': true,
        'high-contrast': true,
    }),
});

/** Values written by "Disable optional decorative effects". */
export const DECORATIVE_OFF = Object.freeze({
    'background-blur': false,
    'transparency': false,
    'glass-borders': false,
    'shadows': false,
    'dock-animations': false,
});

/** Values written by "Enable all supported effects". */
export const ALL_ON = Object.freeze({
    ...PRESETS.full.values,
    ...Object.fromEntries(COMPONENT_KEYS.map(k => [k, true])),
});

/**
 * Whether changing `key` by hand should mark the preset as "custom".
 *
 * @param {string} key - settings key
 * @returns {boolean}
 */
export function isPresetKey(key) {
    return PRESET_KEYS.includes(key);
}

/**
 * Coerce a value to something valid for `key`.
 *
 * @param {string} key - settings key
 * @param {*} value - candidate value
 * @returns {*} a valid value, or undefined when it cannot be made valid
 */
export function sanitize(key, value) {
    const def = KEYS[key];
    if (!def)
        return undefined;

    switch (def.type) {
    case 'b':
        return typeof value === 'boolean' ? value : undefined;
    case 'i':
        if (typeof value !== 'number' || !Number.isFinite(value))
            return undefined;
        return Math.min(def.max, Math.max(def.min, Math.round(value)));
    case 'enum':
        return def.values.includes(value) ? value : undefined;
    default:
        return undefined;
    }
}

/**
 * The default value of every key.
 *
 * @returns {object} key → default
 */
export function defaults() {
    return Object.fromEntries(Object.entries(KEYS).map(([k, d]) => [k, d.default]));
}

/**
 * Name of the preset whose values all match `values`, if any.
 *
 * @param {object} values - current settings
 * @returns {string} preset id, or 'custom'
 */
export function matchPreset(values) {
    for (const [id, p] of Object.entries(PRESETS)) {
        if (PRESET_KEYS.every(k => values[k] === p.values[k]))
            return id;
    }
    return 'custom';
}

/**
 * Serialise settings for export.
 *
 * @param {object} values - current settings
 * @returns {string} pretty-printed JSON
 */
export function exportSettings(values) {
    const settings = {};
    for (const key of Object.keys(KEYS)) {
        const v = sanitize(key, values[key]);
        if (v !== undefined)
            settings[key] = v;
    }
    return JSON.stringify({format: 'ubuntu-glass-settings', version: 1, settings}, null, 2);
}

/**
 * Parse an exported file. Unknown keys and invalid values are skipped and
 * reported rather than applied.
 *
 * @param {string} text - file contents
 * @returns {{settings: object, skipped: string[]}}
 * @throws {Error} when the text is not an Ubuntu Glass settings file
 */
export function importSettings(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('The file is not valid JSON.');
    }
    if (data?.format !== 'ubuntu-glass-settings' || typeof data.settings !== 'object' ||
        data.settings === null || Array.isArray(data.settings))
        throw new Error('The file is not an Ubuntu Glass settings file.');
    if (data.version !== 1)
        throw new Error(`Unsupported settings version: ${data.version}`);

    const settings = {};
    const skipped = [];
    for (const [key, value] of Object.entries(data.settings)) {
        const v = sanitize(key, value);
        if (v === undefined)
            skipped.push(key);
        else
            settings[key] = v;
    }
    return {settings, skipped};
}

/**
 * Read every key from a Gio.Settings object into a plain object.
 *
 * @param {object} gsettings - Gio.Settings for SCHEMA_ID
 * @returns {object} key → value
 */
export function readAll(gsettings) {
    const out = {};
    for (const [key, def] of Object.entries(KEYS)) {
        if (def.type === 'b')
            out[key] = gsettings.get_boolean(key);
        else if (def.type === 'i')
            out[key] = gsettings.get_int(key);
        else
            out[key] = gsettings.get_string(key);
    }
    return out;
}

/**
 * Write a set of values, skipping anything invalid or unchanged.
 *
 * @param {object} gsettings - Gio.Settings for SCHEMA_ID
 * @param {object} values - key → value
 * @returns {string[]} the keys that were actually written
 */
export function writeAll(gsettings, values) {
    const written = [];
    for (const [key, raw] of Object.entries(values)) {
        const def = KEYS[key];
        const v = sanitize(key, raw);
        if (!def || v === undefined)
            continue;
        if (def.type === 'b') {
            if (gsettings.get_boolean(key) === v)
                continue;
            gsettings.set_boolean(key, v);
        } else if (def.type === 'i') {
            if (gsettings.get_int(key) === v)
                continue;
            gsettings.set_int(key, v);
        } else {
            if (gsettings.get_string(key) === v)
                continue;
            gsettings.set_string(key, v);
        }
        written.push(key);
    }
    return written;
}

/**
 * Apply a preset and record it as the current one.
 *
 * @param {object} gsettings - Gio.Settings for SCHEMA_ID
 * @param {string} id - preset id
 * @returns {boolean} false when the preset does not exist
 */
export function applyPreset(gsettings, id) {
    const p = PRESETS[id];
    if (!p)
        return false;
    writeAll(gsettings, {...p.values, preset: id});
    return true;
}

/**
 * Reset every theme preference to its default. System settings the theme
 * changed are restored separately, by the managers that changed them.
 *
 * @param {object} gsettings - Gio.Settings for SCHEMA_ID
 */
export function restoreDefaults(gsettings) {
    writeAll(gsettings, defaults());
}
