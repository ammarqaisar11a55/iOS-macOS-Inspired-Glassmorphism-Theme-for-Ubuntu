// Design tokens for Ubuntu Glass.
//
// Values come from the approved mockup ("Ubuntu Glass Deck", part A). This
// module is pure JavaScript with no GNOME imports, so it can be used by the
// shell process, the preferences process and the test runner alike.

/** Accent colours, one value per appearance. */
export const ACCENTS = {
    orange: {name: 'Ubuntu Orange', dark: '#E8763F', light: '#C4501C'},
    blue: {name: 'Cool Blue', dark: '#78A6E0', light: '#2F6DB5'},
    sage: {name: 'Sage', dark: '#6DB38A', light: '#2E8152'},
    aubergine: {name: 'Aubergine', dark: '#C77AA4', light: '#8E3A6A'},
    graphite: {name: 'Graphite', dark: '#B4B4B8', light: '#55555A'},
};

/** Wallpapers shipped with the theme, in display order. */
export const WALLPAPERS = {
    ember: 'Ember',
    dusk: 'Dusk',
    tide: 'Tide',
    graphite: 'Graphite',
};

// Colours are [r, g, b, a] with r/g/b in 0–255 and a in 0–1.
const W = a => [255, 255, 255, a];
const K = a => [0, 0, 0, a];

const BASE = {
    dark: {
        text: [242, 241, 238, 1],
        text2: [242, 241, 238, 0.70],
        text3: [242, 241, 238, 0.48],
        onAccent: [27, 20, 16, 1],
        blue: [122, 167, 224, 1],
        green: [91, 194, 135, 1],
        amber: [233, 184, 78, 1],
        red: [236, 106, 98, 1],
        onRed: [27, 20, 16, 1],
        bar: [22, 23, 27, 0.52],
        elev: [34, 35, 40, 0.72],
        win: [30, 31, 36, 0.84],
        side: [27, 28, 32, 1],
        card: W(0.07),
        cardOn: W(0.16),
        subtle: W(0.04),
        sel: W(0.10),
        ctl: W(0.10),
        track: W(0.14),
        iconOff: W(0.10),
        input: K(0.22),
        border: W(0.10),
        borderSoft: W(0.06),
        borderStrong: W(0.18),
        scrim: [8, 8, 10, 0.42],
        shadow: [0, 0, 0],
        shadowAlpha: [0.25, 0.35, 0.5, 0.6],
        hcEdge: W(0.32),
    },
    light: {
        text: [28, 28, 30, 1],
        text2: [28, 28, 30, 0.68],
        text3: [28, 28, 30, 0.50],
        onAccent: [255, 255, 255, 1],
        blue: [47, 109, 181, 1],
        green: [44, 138, 82, 1],
        amber: [154, 106, 16, 1],
        red: [198, 60, 52, 1],
        onRed: [255, 255, 255, 1],
        bar: [250, 249, 247, 0.58],
        elev: [248, 247, 244, 0.78],
        win: [250, 249, 247, 0.86],
        side: [239, 237, 233, 1],
        card: W(0.50),
        cardOn: W(0.94),
        subtle: W(0.40),
        sel: K(0.07),
        ctl: K(0.07),
        track: K(0.10),
        iconOff: K(0.07),
        input: W(0.70),
        border: K(0.09),
        borderSoft: K(0.05),
        borderStrong: K(0.15),
        scrim: [240, 238, 234, 0.38],
        shadow: [60, 40, 20],
        shadowAlpha: [0.12, 0.14, 0.22, 0.28],
        hcEdge: K(0.32),
    },
};

// Solid colours used when a surface may not be translucent.
const FALLBACK = {
    dark: {bar: [28, 29, 33], elev: [38, 39, 44], win: [31, 32, 36]},
    light: {bar: [241, 239, 235], elev: [250, 249, 247], win: [247, 246, 243]},
};

const RADII = {xs: 5, sm: 8, md: 12, lg: 16, xl: 22, dock: 24, full: 999};
const RADII_SIMPLE = {xs: 2, sm: 4, md: 4, lg: 4, xl: 6, dock: 6, full: 999};

// Durations in milliseconds: hover/press, menus and focus, popovers and dialogs.
const MOTION = {fast: 100, base: 140, slow: 220};

/** Design blur radius, in pixels, for the bar and dock material. */
export const BLUR_RADIUS = 30;

/** Options that `resolveTokens` understands, with their defaults. */
export const DEFAULT_OPTIONS = Object.freeze({
    mode: 'dark',
    accent: 'orange',
    systemAccent: null,
    glass: true,
    transparency: true,
    intensity: 100,
    borders: true,
    shadows: true,
    rounded: true,
    reducedMotion: false,
    highContrast: false,
});

/**
 * Parse `#RRGGBB` into an [r, g, b, 1] colour.
 *
 * @param {string} hex - colour in `#RRGGBB` form
 * @returns {number[]|null} the colour, or null when `hex` is not valid
 */
export function parseHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
    if (!m)
        return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
}

/**
 * Format a colour for CSS.
 *
 * @param {number[]} c - [r, g, b, a]
 * @returns {string} an `rgba()` expression accepted by both St and GTK
 */
export function css(c) {
    const [r, g, b, a = 1] = c;
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;
}

/**
 * Format a colour as `#rrggbb`, dropping alpha.
 *
 * @param {number[]} c - [r, g, b, a]
 * @returns {string} hex colour
 */
export function hex(c) {
    return `#${c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Composite a translucent colour over an opaque one.
 *
 * @param {number[]} top - [r, g, b, a]
 * @param {number[]} under - opaque [r, g, b]
 * @returns {number[]} opaque [r, g, b, 1]
 */
export function flatten(top, under) {
    const a = top[3] ?? 1;
    return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1);
}

/**
 * WCAG contrast ratio between two opaque colours.
 *
 * @param {number[]} c1 - [r, g, b]
 * @param {number[]} c2 - [r, g, b]
 * @returns {number} ratio between 1 and 21
 */
export function contrast(c1, c2) {
    const lum = c => {
        const [r, g, b] = c.slice(0, 3).map(v => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [lum(c1), lum(c2)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

function withAlpha(c, a) {
    return [c[0], c[1], c[2], a];
}

// A glass surface: the designed tint, made more opaque as intensity drops and
// replaced by the solid fallback when glass is off.
function surface(tint, solid, opts) {
    if (!opts.glass)
        return [...solid, 1];

    const k = clamp(opts.intensity, 0, 100) / 100;
    let alpha = 1 - (1 - tint[3]) * k;
    if (!opts.transparency)
        alpha = Math.max(alpha, 0.96);
    if (opts.highContrast)
        alpha = Math.max(alpha, 0.92);

    // Drift towards the fallback colour as the surface closes up, so an
    // opaque surface matches the "glass off" look exactly.
    const t = (alpha - tint[3]) / (1 - tint[3] || 1);
    const rgb = [0, 1, 2].map(i => tint[i] + (solid[i] - tint[i]) * t);
    return [...rgb, alpha];
}

/**
 * Resolve the full token set for one combination of settings.
 *
 * @param {object} [options] - see DEFAULT_OPTIONS
 * @returns {object} tokens: `c` (CSS colour strings), `raw` (colour arrays),
 *   `r` (radii in px), `t` (durations in ms) and `shadow` (CSS values)
 */
export function resolveTokens(options = {}) {
    const opts = {...DEFAULT_OPTIONS, ...options};
    const mode = opts.mode === 'light' ? 'light' : 'dark';
    const base = BASE[mode];
    const solid = FALLBACK[mode];

    const accentDef = ACCENTS[opts.accent];
    const accent = (accentDef ? parseHex(accentDef[mode]) : parseHex(opts.systemAccent)) ??
        parseHex(ACCENTS.orange[mode]);
    // System accents are arbitrary, so pick the ink with the better contrast.
    const onAccent = accentDef
        ? base.onAccent
        : [[27, 20, 16, 1], [255, 255, 255, 1]]
            .sort((a, b) => contrast(b, accent) - contrast(a, accent))[0];

    const raw = {
        ...base,
        accent,
        onAccent,
        accentSoft: withAlpha(accent, mode === 'dark' ? 0.24 : 0.16),
        redSoft: withAlpha(base.red, 0.16),
        bar: surface(base.bar, solid.bar, opts),
        elev: surface(base.elev, solid.elev, opts),
        win: surface(base.win, solid.win, opts),
        winSolid: [...solid.win, 1],
        elevSolid: [...solid.elev, 1],
        barSolid: [...solid.bar, 1],
    };

    if (opts.highContrast) {
        raw.text2 = raw.text;
        raw.text3 = withAlpha(raw.text, 0.8);
        raw.border = raw.borderSoft = raw.borderStrong = base.hcEdge;
    }
    if (!opts.borders && !opts.highContrast)
        raw.border = raw.borderSoft = raw.borderStrong = withAlpha(base.border, 0);

    const c = {};
    for (const [key, value] of Object.entries(raw)) {
        if (Array.isArray(value) && value.length === 4)
            c[key] = css(value);
    }

    const sh = a => css([...base.shadow, a]);
    const [a1, a2, a3, a4] = base.shadowAlpha;
    const shadow = opts.shadows
        ? {
            e1: `0 8px 24px 0 ${sh(a1)}`,
            e2: `0 12px 32px 0 ${sh(a2)}`,
            e3: `0 16px 48px 0 ${sh(a3)}`,
            e4: `0 24px 64px 0 ${sh(a4)}`,
        }
        : {e1: 'none', e2: 'none', e3: 'none', e4: 'none'};

    const t = opts.reducedMotion
        ? {fast: 0, base: 0, slow: 0}
        : {...MOTION};

    return {
        mode,
        opts,
        c,
        raw,
        r: opts.rounded ? {...RADII} : {...RADII_SIMPLE},
        t,
        shadow,
    };
}
