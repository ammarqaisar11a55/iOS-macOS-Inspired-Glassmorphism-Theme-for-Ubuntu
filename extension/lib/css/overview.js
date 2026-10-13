// Activities overview: search field, app grid, folders and search results.

import {rule, section, edge, focusRing} from './util.js';

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for the overview
 */
export function overviewCss(t) {
    const {c, r} = t;
    const tile = ['.overview-tile', '.grid-search-result'];
    const st = s => tile.map(x => `${x}${s}`);
    const rows = ['.list-search-result', '.search-provider-icon'];

    return section('Overview', [
        rule('.search-entry', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.md}px`,
            'box-shadow': t.shadow.e1,
        }),
        rule('.search-entry:hover', {
            'background-color': c.elev,
            'border-color': c.borderStrong,
        }),
        rule('.search-entry:focus', {
            'color': c.text,
            'background-color': c.elev,
            'border-color': c.accent,
            'box-shadow': `0 0 0 3px ${c.accentSoft} !important`,
        }),
        rule(['.search-entry StLabel.hint-text', '.search-entry .search-entry-icon'], {
            color: c.text2,
        }),

        rule(tile, {
            'color': c.text,
            'border-radius': `${r.lg}px`,
            'transition-duration': `${t.t.fast}ms`,
        }),
        rule(st(':hover'), {color: c.text, 'background-color': c.sel}),
        rule([...st(':active'), ...st(':checked'), ...st(':selected'), ...st(':highlighted')], {
            'color': c.text,
            'background-color': c.cardOn,
        }),
        rule(st(':focus'), {
            'color': c.text,
            'background-color': c.sel,
            'box-shadow': focusRing(t),
        }),

        rule('.app-folder .overview-icon', {
            'background-color': c.card,
            'border': edge(c.borderSoft),
            'border-radius': `${r.lg}px`,
        }),
        rule('.app-folder-dialog', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.xl}px`,
        }),

        rule('.search-section-content', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.lg}px`,
        }),
        rule(rows, {
            'color': c.text,
            'border-radius': `${r.md}px`,
        }),
        rule(rows.flatMap(x => [`${x}:hover`, `${x}:selected`]), {
            'background-color': c.sel,
        }),
        rule(rows.map(x => `${x}:focus`), {
            'background-color': c.sel,
            'box-shadow': focusRing(t),
        }),
        rule('.list-search-result .list-search-result-description', {color: c.text2}),

        rule('.workspace-thumbnail-indicator', {
            'border-color': c.accent,
        }),
        rule('.page-indicator .page-indicator-icon', {
            'background-color': c.text,
        }),
    ]);
}
