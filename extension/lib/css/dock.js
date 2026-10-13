// Dock: primary glass on a floating, rounded bar.
//
// Targets Ubuntu Dock / Dash to Dock (#dashtodockContainer) and the stock
// GNOME dash (#dash), which share the same inner structure.

import {rule, section, edge, focusRing, cross} from './util.js';

const SIDES = ['bottom', 'top', 'left', 'right'];
const TILES = ['.app-well-app', '.show-apps', '.overview-tile'];

/**
 * @param {object} t - resolved tokens
 * @param {object} [flags]
 * @param {boolean} [flags.animations] - whether dock transitions are allowed
 * @returns {string} CSS for the dock
 */
export function dockCss(t, {animations = true} = {}) {
    const {c, r} = t;
    const docks = [...SIDES.map(s => `#dashtodockContainer.${s} #dash`), '#dash'];
    const items = cross(docks, ['.dash-item-container']);
    const tiles = cross(items, TILES);
    const icon = (state = '') => tiles.map(s => `${s}${state} .overview-icon`);
    const duration = animations ? t.t.base : 0;

    return section('Dock', [
        rule(cross(docks, ['.dash-background']), {
            'background-color': c.bar,
            'border': edge(c.border),
            'border-radius': `${r.dock}px`,
            'box-shadow': t.shadow.e1,
        }),
        rule(icon(), {
            'color': c.text,
            'background-color': 'transparent',
            'border-radius': `${r.lg}px`,
            'transition-duration': `${duration}ms`,
        }),
        rule(icon(':hover'), {
            'color': c.text,
            'background-color': c.sel,
        }),
        rule([...icon(':active'), ...icon(':checked')], {
            'color': c.text,
            'background-color': c.cardOn,
        }),
        rule([...icon('.focused'), ...icon('.focused:hover')], {
            'background-color': c.cardOn,
        }),
        rule(icon(':focus'), {
            'background-color': c.sel,
            'box-shadow': focusRing(t),
        }),
        rule(cross(docks, ['.dash-separator']), {
            'background-color': c.border,
        }),
        rule(cross(docks, ['.app-grid-running-dot', '.app-well-app-running-dot']), {
            'background-color': c.text,
        }),
        rule(cross(items, ['> StButton']), {
            'transition-duration': `${duration}ms`,
        }),
    ]);
}
