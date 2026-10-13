// Small helpers shared by the stylesheet builders.

/**
 * Build one CSS rule.
 *
 * @param {string|string[]} selectors - one selector or a list of them
 * @param {object} declarations - property → value; null/undefined are skipped
 * @returns {string} the rule, or '' when it would be empty
 */
export function rule(selectors, declarations) {
    const body = Object.entries(declarations)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n');
    if (!body)
        return '';
    const head = Array.isArray(selectors) ? selectors.join(',\n') : selectors;
    return `${head} {\n${body}\n}\n`;
}

/**
 * Join rules into a stylesheet section with a heading comment.
 *
 * @param {string} title - section name
 * @param {string[]} rules - output of `rule`
 * @returns {string}
 */
export function section(title, rules) {
    return `/* ${title} */\n${rules.filter(Boolean).join('\n')}\n`;
}

/**
 * Hairline edge. Kept at 1px even when transparent so toggling borders never
 * shifts layout.
 *
 * @param {string} color - CSS colour
 * @returns {string}
 */
export function edge(color) {
    return `1px solid ${color}`;
}

/**
 * Keyboard focus ring drawn inside the widget, as St cannot draw outlines.
 *
 * @param {object} t - resolved tokens
 * @returns {string} a box-shadow value
 */
export function focusRing(t) {
    return `inset 0 0 0 2px ${t.c.accent} !important`;
}

/**
 * Flat fill implemented as an inset shadow, the technique Yaru uses for
 * panel buttons so hover states do not affect layout.
 *
 * @param {string} color - CSS colour
 * @returns {string} a box-shadow value
 */
export function fill(color) {
    return `inset 0 0 0 100px ${color}`;
}

/**
 * Prefix every selector in a list.
 *
 * @param {string[]} prefixes - ancestors
 * @param {string[]} suffixes - descendants
 * @returns {string[]} every combination
 */
export function cross(prefixes, suffixes) {
    return prefixes.flatMap(p => suffixes.map(s => `${p} ${s}`));
}
