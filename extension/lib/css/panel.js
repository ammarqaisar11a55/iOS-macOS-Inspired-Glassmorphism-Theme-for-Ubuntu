// Top bar: primary glass, square to the screen edge.

import {rule, section, fill, focusRing} from './util.js';

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for the top bar
 */
export function panelCss(t) {
    const {c, r} = t;
    const button = '#panel .panel-button';

    return section('Top bar', [
        // Yaru sets the panel colour with !important, so this must too.
        rule(['#panel', '#panel:overview'], {
            'background-color': `${c.bar} !important`,
            'color': c.text,
            'box-shadow': `0 1px 0 0 ${c.borderSoft}`,
            'transition-duration': `${t.t.slow}ms`,
        }),
        rule(['#panel.unlock-screen', '#panel.login-screen'], {
            'background-color': 'transparent !important',
            'box-shadow': 'none',
        }),
        rule([button, `${button}.clock-display .clock`], {
            'color': c.text,
            'font-weight': '500 !important',
            'border-radius': `${r.sm}px`,
            'transition-duration': `${t.t.fast}ms`,
        }),
        rule([
            `${button}:hover`,
            `${button}.clock-display:hover .clock`,
        ], {
            'color': c.text,
            'box-shadow': fill(c.sel),
        }),
        rule([
            `${button}:active`, `${button}:checked`,
            `${button}:active:hover`, `${button}:checked:hover`,
            `${button}.clock-display:active .clock`,
            `${button}.clock-display:checked .clock`,
        ], {
            'color': c.text,
            'box-shadow': fill(c.track),
        }),
        rule([`${button}:focus`, `${button}.clock-display:focus .clock`], {
            'box-shadow': focusRing(t),
        }),
        rule(`${button}#panelActivities .workspace-dot`, {
            'background-color': `${c.text} !important`,
        }),
        rule(`${button} .system-status-icon`, {
            color: c.text,
        }),
    ]);
}
