// Popup menus, tooltips and the shared form controls that live inside them.

import {rule, section, edge, focusRing} from './util.js';

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for menus, tooltips, switches and sliders
 */
export function menusCss(t) {
    const {c, r} = t;
    const item = '.popup-menu-item';

    return section('Menus and tooltips', [
        rule('.popup-menu', {color: c.text}),
        rule(['.popup-menu-content', '.candidate-popup-content'], {
            'background-color': c.elev,
            'color': c.text,
            'border': edge(c.border),
            'border-radius': `${r.md}px`,
            'box-shadow': t.shadow.e3,
            'padding': '6px',
        }),
        rule(item, {
            'color': c.text,
            'border-radius': `${r.sm}px`,
            'transition-duration': `${t.t.fast}ms`,
        }),
        // Yaru forces the hover colour with !important.
        rule([`${item}:hover`, `${item}:selected`], {
            'color': c.text,
            'background-color': `${c.sel} !important`,
        }),
        rule([`${item}:active`, `${item}:active:hover`], {
            'color': c.text,
            'background-color': `${c.cardOn} !important`,
        }),
        rule(`${item}:checked`, {
            'color': c.text,
            'background-color': c.sel,
        }),
        rule(`${item}:focus`, {'box-shadow': focusRing(t)}),
        rule(`${item}:insensitive`, {color: c.text3}),
        rule('.popup-sub-menu', {
            'background-color': c.card,
            'border-radius': `0 0 ${r.sm}px ${r.sm}px`,
        }),
        rule('.popup-separator-menu-item .popup-separator-menu-item-separator', {
            'background-color': c.borderSoft,
        }),
        rule('.popup-inactive-menu-item', {color: c.text2}),

        // Tooltips and label pills: the subtle material.
        rule(['.dash-label', '.window-caption', '.screenshot-ui-tooltip'], {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.borderSoft),
            'border-radius': `${r.sm}px`,
            'box-shadow': t.shadow.e1,
        }),

        // Switches: the knob position carries state, colour reinforces it.
        rule('.toggle-switch', {
            'background-color': c.track,
            'transition-duration': `${t.t.base}ms`,
        }),
        rule('.toggle-switch:hover', {'background-color': c.cardOn}),
        rule(['.toggle-switch:checked', '.toggle-switch:checked:hover'], {
            'color': c.onAccent,
            'background-color': c.accent,
        }),
        rule('.toggle-switch .handle', {
            'background-color': '#ffffff',
            'transition-duration': `${t.t.base}ms`,
        }),

        rule('.slider', {
            '-barlevel-background-color': c.track,
            '-barlevel-active-background-color': c.accent,
        }),
        rule(['.check-box:checked StIcon', '.check-box:checked:hover StIcon'], {
            'color': c.onAccent,
            'background-color': c.accent,
        }),
    ]);
}
