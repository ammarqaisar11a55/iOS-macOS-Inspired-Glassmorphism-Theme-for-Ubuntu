// Quick settings: an elevated glass panel holding secondary-glass tiles.
// Active tiles lift onto a brighter card and carry an accent disc behind the
// icon, so state never depends on colour alone.

import {rule, section, edge, focusRing} from './util.js';

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for the quick settings menu
 */
export function quickSettingsCss(t) {
    const {c, r} = t;
    const tile = ['.quick-toggle', '.quick-toggle-has-menu .quick-toggle-menu-button'];
    const st = s => tile.map(x => `${x}${s}`);
    const inner = Math.max(r.xl - 10, r.sm);

    return section('Quick settings', [
        rule('.popup-menu-content.quick-settings', {
            'background-color': c.elev,
            'color': c.text,
            'border': edge(c.border),
            'border-radius': `${r.xl}px`,
            'box-shadow': t.shadow.e3,
            'padding': '10px',
        }),
        rule('.quick-settings-grid', {
            'spacing-rows': '8px',
            'spacing-columns': '8px',
        }),
        rule(['.quick-toggle', '.quick-toggle-has-menu'], {
            'border-radius': `${inner}px`,
        }),
        rule(tile, {
            'color': c.text,
            'background-color': c.card,
            'border-radius': `${inner}px`,
            'transition-duration': `${t.t.fast}ms`,
        }),
        rule(st(':hover'), {color: c.text, 'background-color': c.sel}),
        rule(st(':active'), {color: c.text, 'background-color': c.cardOn}),
        rule([...st(':checked'), ...st(':checked:hover'), ...st(':checked:active')], {
            'color': c.text,
            'background-color': c.cardOn,
        }),
        rule([...st(':focus'), ...st(':checked:focus')], {
            'box-shadow': focusRing(t),
        }),
        rule(st(':insensitive'), {
            'color': c.text3,
            'background-color': c.card,
        }),

        // The split tile: keep the outer corners, square the inner seam.
        rule('.quick-toggle-has-menu .quick-toggle:ltr', {
            'border-radius': `${inner}px 0 0 ${inner}px`,
        }),
        rule('.quick-toggle-has-menu .quick-toggle:rtl', {
            'border-radius': `0 ${inner}px ${inner}px 0`,
        }),
        rule([
            '.quick-toggle-has-menu .quick-toggle:ltr:last-child',
            '.quick-toggle-has-menu .quick-toggle:rtl:last-child',
        ], {'border-radius': `${inner}px`}),
        rule('.quick-toggle-has-menu .quick-toggle-menu-button:ltr', {
            'border-radius': `0 ${inner}px ${inner}px 0`,
        }),
        rule('.quick-toggle-has-menu .quick-toggle-menu-button:rtl', {
            'border-radius': `${inner}px 0 0 ${inner}px`,
        }),
        rule([
            '.quick-toggle-has-menu .quick-toggle-separator',
            '.quick-toggle-has-menu:checked .quick-toggle-separator',
        ], {'background-color': c.border}),

        // Icon disc: neutral when off, accent when on.
        rule('.quick-toggle .quick-toggle-icon', {
            'color': c.text,
            'background-color': c.iconOff,
            'border-radius': `${r.full}px`,
            'padding': '6px',
        }),
        rule('.quick-toggle:checked .quick-toggle-icon', {
            'color': c.onAccent,
            'background-color': c.accent,
        }),
        rule('.quick-toggle .quick-toggle-subtitle', {color: c.text2}),

        // Expanded tile menu.
        rule('.quick-toggle-menu', {
            'color': c.text,
            'background-color': c.card,
            'border': edge(c.borderSoft),
            'border-radius': `${inner}px`,
        }),
        rule('.quick-toggle-menu .header .icon', {
            'color': c.text,
            'background-color': c.iconOff,
        }),
        rule('.quick-toggle-menu .header .icon.active', {
            'color': c.onAccent,
            'background-color': c.accent,
        }),
        rule('.quick-toggle-menu .header .subtitle', {color: c.text2}),

        // Sliders and the round system buttons.
        rule(['.quick-slider .slider', '.popup-menu .slider'], {
            'color': t.mode === 'dark' ? '#ffffff' : '#ffffff',
            '-barlevel-height': '6px',
            '-barlevel-background-color': c.track,
            '-barlevel-active-background-color': c.accent,
            '-slider-handle-radius': '9px',
        }),
        rule([
            '.quick-settings .icon-button',
            '.quick-settings-system-item .icon-button',
            '.quick-settings .button',
        ], {
            'color': c.text,
            'background-color': c.ctl,
        }),
        rule([
            '.quick-settings .icon-button:hover',
            '.quick-settings .button:hover',
        ], {'color': c.text, 'background-color': c.cardOn}),
        rule([
            '.quick-settings .icon-button:focus',
            '.quick-settings .button:focus',
        ], {'box-shadow': focusRing(t)}),
        rule('.quick-slider .icon-button', {
            'background-color': 'transparent',
        }),
    ]);
}
