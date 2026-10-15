// Modal dialogs, on-screen overlays and the window switcher. The lock screen
// has its own builder, lockScreen.js.

import {rule, section, edge, focusRing} from './util.js';

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for dialogs and overlays
 */
export function dialogsCss(t) {
    const {c, r} = t;
    const button = '.modal-dialog .modal-dialog-button-box .modal-dialog-button';
    const entries = [
        '.modal-dialog StEntry',
        '.prompt-dialog StEntry',
        '.run-dialog StEntry',
    ];
    const st = s => entries.map(x => `${x}${s}`);

    return section('Dialogs and overlays', [
        rule('.modal-dialog', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.borderStrong),
            'border-radius': `${r.lg}px`,
            'box-shadow': t.shadow.e4,
        }),
        rule([
            '.message-dialog-content .message-dialog-title',
            '.prompt-dialog .prompt-dialog-password-label',
        ], {color: c.text}),
        rule([
            '.message-dialog-content .message-dialog-description',
            '.prompt-dialog .prompt-dialog-description',
            '.run-dialog .run-dialog-description',
        ], {color: c.text2}),

        // Buttons: the safe action stays neutral; the default is accented.
        rule(button, {
            'color': c.text,
            'background-color': c.ctl,
            'border-radius': `${r.sm}px`,
            'transition-duration': `${t.t.fast}ms`,
        }),
        rule(`${button}:hover`, {color: c.text, 'background-color': c.cardOn}),
        rule([`${button}:active`, `${button}:active:hover`], {
            'color': c.text,
            'background-color': c.cardOn,
        }),
        rule([`${button}:focus`, `${button}:focus:hover`], {
            'color': c.text,
            'background-color': c.ctl,
            'box-shadow': focusRing(t),
        }),
        rule(`${button}:insensitive`, {color: c.text3, 'background-color': c.card}),
        rule([`${button}.default`, `${button}.default:hover`, `${button}.default:focus`], {
            'color': c.onAccent,
            'background-color': c.accent,
        }),
        rule([`${button}.destructive-action`, `${button}.destructive-action:hover`], {
            'color': c.onRed,
            'background-color': c.red,
        }),

        // Text fields.
        rule(entries, {
            'color': c.text,
            'background-color': c.input,
            'border': edge(c.border),
            'border-radius': `${r.sm}px`,
        }),
        rule(st(':hover'), {'background-color': c.input, 'border-color': c.borderStrong}),
        rule(st(':focus'), {
            'color': c.text,
            'background-color': c.input,
            'border-color': c.accent,
            'box-shadow': `0 0 0 3px ${c.accentSoft} !important`,
        }),
        rule(entries.map(x => `${x} StLabel.hint-text`), {color: c.text3}),
        rule('.prompt-dialog .prompt-dialog-error-label', {
            'color': c.red,
            'background-color': c.redSoft,
            'border-radius': `${r.sm}px`,
        }),

        // Volume, brightness and other OSD overlays.
        rule('.osd-window', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.lg}px`,
            'box-shadow': t.shadow.e3,
        }),
        rule('.osd-window .level', {
            '-barlevel-height': '6px',
            '-barlevel-background-color': c.track,
            '-barlevel-active-background-color': c.accent,
        }),
        rule(['.osd-monitor-label', '.workspace-switcher', '.resize-popup'], {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.lg}px`,
        }),

        // Alt+Tab.
        rule('.switcher-list', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.xl}px`,
            'box-shadow': t.shadow.e3,
        }),
        rule('.switcher-list .item-box', {
            'color': c.text,
            'border-radius': `${r.lg}px`,
        }),
        rule('.switcher-list .item-box:hover', {'background-color': c.sel}),
        rule(['.switcher-list .item-box:selected', '.switcher-list .item-box:focus'], {
            'color': c.text,
            'background-color': c.cardOn,
        }),
    ]);
}
