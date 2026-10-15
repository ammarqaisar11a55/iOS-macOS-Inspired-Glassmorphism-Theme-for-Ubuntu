// Unit tests for the pure modules: tokens, settings model and stylesheet
// builders. Run with:  gjs -m tests/run.js

import GLib from 'gi://GLib';

import * as Model from '../extension/lib/model.js';
import * as Tokens from '../extension/lib/tokens.js';
import {buildShellCss} from '../extension/lib/css/index.js';
import {buildGtk3Css, buildGtk4Css} from '../extension/lib/css/gtk.js';
import {buildTerminalPalette, terminalOpacity} from '../extension/lib/css/terminal.js';

let passed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
    } catch (e) {
        failures.push(`${name}: ${e.message}`);
    }
}

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function equal(actual, expected, message = '') {
    if (actual !== expected)
        throw new Error(`${message} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const here = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]);
const schemaPath = GLib.build_filenamev([here, '..', 'extension', 'schemas',
    `${Model.SCHEMA_ID}.gschema.xml`]);
const schemaXml = new TextDecoder().decode(GLib.file_get_contents(schemaPath)[1]);

// --- Settings model --------------------------------------------------------

test('every model key exists in the schema with the same default', () => {
    for (const [key, def] of Object.entries(Model.KEYS)) {
        const m = new RegExp(`<key name="${key}"[^>]*>([\\s\\S]*?)</key>`).exec(schemaXml);
        assert(m, `schema is missing ${key}`);
        const raw = /<default>([^<]*)<\/default>/.exec(m[1])[1].replaceAll("'", '');
        equal(raw, String(def.default), `${key} default:`);
    }
});

test('every schema key except backup is in the model', () => {
    for (const [, key] of schemaXml.matchAll(/<key name="([^"]+)"/g)) {
        if (key !== 'backup')
            assert(key in Model.KEYS, `model is missing ${key}`);
    }
});

test('sanitize rejects wrong types and unknown choices', () => {
    equal(Model.sanitize('shadows', 'yes'), undefined);
    equal(Model.sanitize('accent', 'pink'), undefined);
    equal(Model.sanitize('no-such-key', true), undefined);
    equal(Model.sanitize('glass-intensity', NaN), undefined);
});

test('sanitize clamps and rounds integers', () => {
    equal(Model.sanitize('glass-intensity', 250), 100);
    equal(Model.sanitize('blur-intensity', -5), 0);
    equal(Model.sanitize('glass-intensity', 49.6), 50);
});

test('defaults match the Full Glass preset', () => {
    equal(Model.matchPreset(Model.defaults()), 'full');
});

test('each preset is recognised from its own values', () => {
    for (const [id, preset] of Object.entries(Model.PRESETS))
        equal(Model.matchPreset({...Model.defaults(), ...preset.values}), id);
});

test('changing a preset-controlled key yields custom', () => {
    equal(Model.matchPreset({...Model.defaults(), shadows: false}), 'custom');
});

test('presets never touch wallpaper, icons, accent, mode or components', () => {
    const offLimits = ['wallpaper', 'wallpaper-name', 'icon-theme', 'accent', 'appearance',
        'show-indicator', ...Model.COMPONENT_KEYS];
    for (const preset of Object.values(Model.PRESETS)) {
        for (const key of offLimits)
            assert(!(key in preset.values), `preset writes ${key}`);
    }
});

test('preset values are all valid', () => {
    for (const preset of Object.values(Model.PRESETS)) {
        for (const [key, value] of Object.entries(preset.values))
            equal(Model.sanitize(key, value), value, key);
    }
});

test('export then import round-trips', () => {
    const values = {...Model.defaults(), accent: 'sage', 'glass-intensity': 35, wallpaper: true};
    const {settings, skipped} = Model.importSettings(Model.exportSettings(values));
    equal(skipped.length, 0);
    for (const key of Object.keys(Model.KEYS))
        equal(settings[key], values[key], key);
});

test('import skips unknown keys and invalid values', () => {
    const text = JSON.stringify({
        format: 'ubuntu-glass-settings',
        version: 1,
        settings: {shadows: false, accent: 'pink', bogus: 1, 'glass-intensity': 400},
    });
    const {settings, skipped} = Model.importSettings(text);
    equal(settings.shadows, false);
    equal(settings['glass-intensity'], 100);
    equal(skipped.sort().join(','), 'accent,bogus');
});

test('import rejects foreign and malformed files', () => {
    for (const text of ['not json', '{}', '[]', '{"format":"other","settings":{}}',
        '{"format":"ubuntu-glass-settings","version":2,"settings":{}}']) {
        let threw = false;
        try {
            Model.importSettings(text);
        } catch {
            threw = true;
        }
        assert(threw, `accepted ${text}`);
    }
});

// --- Tokens ----------------------------------------------------------------

test('design values are reproduced at full intensity', () => {
    const dark = Tokens.resolveTokens({mode: 'dark'});
    equal(dark.c.bar, 'rgba(22, 23, 27, 0.52)');
    equal(dark.c.elev, 'rgba(34, 35, 40, 0.72)');
    equal(dark.c.accent, 'rgba(232, 118, 63, 1)');
    const light = Tokens.resolveTokens({mode: 'light'});
    equal(light.c.bar, 'rgba(250, 249, 247, 0.58)');
    equal(light.c.accent, 'rgba(196, 80, 28, 1)');
});

test('glass off uses the solid fallback', () => {
    const t = Tokens.resolveTokens({glass: false});
    equal(t.raw.bar[3], 1);
    equal(t.raw.elev[3], 1);
    equal(t.c.bar, 'rgba(28, 29, 33, 1)');
});

test('transparency off keeps surfaces at 96% or more', () => {
    const t = Tokens.resolveTokens({transparency: false});
    assert(t.raw.bar[3] >= 0.96 && t.raw.elev[3] >= 0.96, 'surface too translucent');
});

test('intensity moves alpha monotonically towards opaque', () => {
    let last = 0;
    for (const intensity of [100, 75, 50, 25, 0]) {
        const a = Tokens.resolveTokens({intensity}).raw.bar[3];
        assert(a >= last, `alpha went down at ${intensity}`);
        last = a;
    }
    equal(last, 1);
});

test('borders off makes edges transparent; high contrast overrides it', () => {
    equal(Tokens.resolveTokens({borders: false}).raw.border[3], 0);
    equal(Tokens.resolveTokens({borders: false, highContrast: true}).raw.border[3], 0.32);
});

test('shadows off, rounded off and reduced motion take effect', () => {
    const t = Tokens.resolveTokens({shadows: false, rounded: false, reducedMotion: true});
    equal(t.shadow.e3, 'none');
    equal(t.r.dock, 6);
    equal(t.t.slow, 0);
});

test('text meets WCAG AA on every surface, both modes', () => {
    // Worst case behind a tint is pure white (dark mode) or pure black (light).
    for (const mode of ['dark', 'light']) {
        const t = Tokens.resolveTokens({mode});
        const worst = mode === 'dark' ? [255, 255, 255] : [0, 0, 0];
        for (const name of ['elev', 'win']) {
            const bg = Tokens.flatten(t.raw[name], worst);
            const ratio = Tokens.contrast(Tokens.flatten(t.raw.text, bg), bg);
            assert(ratio >= 4.5, `${mode} ${name}: ${ratio.toFixed(2)}`);
        }
    }
});

test('on-accent ink is readable on every accent', () => {
    for (const mode of ['dark', 'light']) {
        for (const accent of Object.keys(Tokens.ACCENTS)) {
            const t = Tokens.resolveTokens({mode, accent});
            const ratio = Tokens.contrast(t.raw.onAccent, t.raw.accent);
            assert(ratio >= 4.5, `${mode} ${accent}: ${ratio.toFixed(2)}`);
        }
    }
});

test('system accent falls back to orange when unknown', () => {
    equal(Tokens.resolveTokens({accent: 'system', systemAccent: null}).c.accent,
        'rgba(232, 118, 63, 1)');
    equal(Tokens.resolveTokens({accent: 'system', systemAccent: '#3584e4'}).c.accent,
        'rgba(53, 132, 228, 1)');
});

// --- Stylesheets -----------------------------------------------------------

const COMPONENT_MARKERS = {
    'panel-style': '/* Top bar */',
    'dock-style': '/* Dock */',
    'quick-settings-style': '/* Quick settings */',
    'notifications-style': '/* Notifications and calendar */',
    'menus-style': '/* Menus and tooltips */',
    'dialogs-style': '/* Dialogs and overlays */',
    'lock-screen-style': '/* Lock screen */',
    'overview-style': '/* Overview */',
};

function wellFormed(css, label) {
    equal((css.match(/{/g) ?? []).length, (css.match(/}/g) ?? []).length, `${label} braces:`);
    assert(!/undefined|NaN|\[object/.test(css), `${label} contains a bad value`);
}

test('stylesheet is well formed for every preset, mode and accent', () => {
    for (const preset of Object.values(Model.PRESETS)) {
        for (const mode of ['dark', 'light']) {
            for (const accent of Model.KEYS.accent.values) {
                const values = {...Model.defaults(), ...preset.values, accent};
                wellFormed(buildShellCss(values, {mode}), `${preset.title}/${mode}/${accent}`);
                wellFormed(buildGtk4Css(values, {mode}), 'gtk4');
                wellFormed(buildGtk3Css(values, {mode}), 'gtk3');
            }
        }
    }
});

test('each component switch removes only its own section', () => {
    const all = Object.keys(COMPONENT_MARKERS);
    for (const off of all) {
        const css = buildShellCss({...Model.defaults(), [off]: false}, {mode: 'dark'});
        for (const key of all)
            equal(css.includes(COMPONENT_MARKERS[key]), key !== off, `${off} off, ${key}:`);
    }
});

test('all components off produces an empty stylesheet', () => {
    const values = {...Model.defaults()};
    for (const key of Object.keys(COMPONENT_MARKERS))
        values[key] = false;
    equal(buildShellCss(values, {mode: 'dark'}), '');
});

test('every style key changes the generated stylesheet', () => {
    const base = Model.defaults();
    const baseCss = buildShellCss(base, {mode: 'dark'});
    for (const key of Model.STYLE_KEYS) {
        if (key === 'appearance')
            continue; // Resolved into `mode` by the extension.
        const def = Model.KEYS[key];
        let other;
        if (def.type === 'b')
            other = !base[key];
        else if (def.type === 'i')
            other = 40;
        else
            other = def.values.find(v => v !== base[key]);
        assert(buildShellCss({...base, [key]: other}, {mode: 'dark'}) !== baseCss,
            `${key} has no effect`);
    }
});

test('dark and light stylesheets differ', () => {
    assert(buildShellCss(Model.defaults(), {mode: 'dark'}) !==
        buildShellCss(Model.defaults(), {mode: 'light'}), 'identical');
});

test('reduced motion and system animations off remove transitions', () => {
    for (const css of [
        buildShellCss({...Model.defaults(), 'reduced-motion': true}, {mode: 'dark'}),
        buildShellCss(Model.defaults(), {mode: 'dark', systemAnimations: false}),
    ])
        assert(!/transition-duration: [1-9]/.test(css), 'a transition survived');
});

// --- Terminal --------------------------------------------------------------

test('terminal palette has both variants with 16 colours each', () => {
    const text = buildTerminalPalette(Model.defaults(), {mode: 'dark'});
    assert(text.includes('[Palette]') && text.includes('Name=Ubuntu Glass'), 'missing header');
    for (const section of ['[Light]', '[Dark]']) {
        const body = text.split(section)[1].split('\n[')[0];
        for (let i = 0; i < 16; i++)
            assert(new RegExp(`^Color${i}=#[0-9A-Fa-f]{6}$`, 'm').test(body), `${section} Color${i}`);
        for (const key of ['Background', 'Foreground', 'Cursor'])
            assert(new RegExp(`^${key}=#[0-9A-Fa-f]{6}$`, 'm').test(body), `${section} ${key}`);
    }
});

test('light terminal colours are readable on the light background', () => {
    const text = buildTerminalPalette(Model.defaults(), {mode: 'light'});
    const body = text.split('[Light]')[1].split('\n[')[0];
    const bg = Tokens.parseHex(/^Background=(#\w{6})$/m.exec(body)[1]);
    for (let i = 0; i < 16; i++) {
        if (i === 0)
            continue; // Black is a background colour in most programs.
        const c = Tokens.parseHex(new RegExp(`^Color${i}=(#\\w{6})$`, 'm').exec(body)[1]);
        const min = i === 7 ? 3 : 4.5;
        const ratio = Tokens.contrast(c, bg);
        assert(ratio >= min, `Color${i}: ${ratio.toFixed(2)}`);
    }
});

test('terminal cursor follows the accent', () => {
    const blue = buildTerminalPalette({...Model.defaults(), accent: 'blue'}, {mode: 'dark'});
    assert(/^Cursor=#78a6e0$/mi.test(blue), 'dark cursor is not Cool Blue');
});

test('terminal opacity follows glass, intensity and transparency', () => {
    const d = Model.defaults();
    equal(terminalOpacity(d, {mode: 'dark'}), 0.9);
    equal(terminalOpacity(d, {mode: 'light'}), 0.94);
    equal(terminalOpacity({...d, 'glass-effects': false}, {mode: 'dark'}), 1);
    equal(terminalOpacity({...d, 'glass-intensity': 0}, {mode: 'dark'}), 1);
    assert(terminalOpacity({...d, transparency: false}, {mode: 'dark'}) >= 0.96, 'transparency off');
});

// --- Report ----------------------------------------------------------------

print(`${passed} passed, ${failures.length} failed`);
for (const failure of failures)
    print(`  FAIL ${failure}`);
imports.system.exit(failures.length ? 1 : 0);
