// Lock screen, after the approved "Lock" mockup.
//
// A tint over GNOME's blurred wallpaper, a large thin clock with the date
// above it, a ringed avatar, a glass password field and round glass buttons.
// Everything follows the appearance mode, so the lock screen has a dark and
// a light version like the rest of the theme.

import {rule, section, edge} from './util.js';

// The mockup's tint over the blurred wallpaper. In light mode the blur is
// brightened by lockScreenManager.js, so the light tint can stay close to the
// design's.
const SCRIM = {
    dark: 'rgba(8, 8, 10, 0.42)',
    light: 'rgba(240, 238, 234, 0.45)',
};

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for the lock screen
 */
export function lockScreenCss(t) {
    const {c, r} = t;
    const button = [
        '.unlock-dialog .login-dialog-button',
        '.unlock-dialog .login-dialog-button.switch-user-button',
        '.unlock-dialog .login-dialog-button.cancel-button',
        '.unlock-dialog .login-dialog-button.login-dialog-auth-menu-button',
        '.unlock-dialog .icon-button',
    ];
    const st = s => button.map(b => `${b}${s}`);
    const entry = '.unlock-dialog .login-dialog-prompt-entry';

    return section('Lock screen', [
        rule('.unlock-dialog', {
            'background-color': SCRIM[t.mode],
            'color': c.text,
        }),

        // Clock: 26 px date over a 176 px light-weight time. Yaru forces
        // normal weight with !important, so these must too.
        rule('.unlock-dialog-clock', {
            'color': c.text,
            'spacing': '0.3em',
        }),
        rule('.unlock-dialog-clock .unlock-dialog-clock-time', {
            'font-size': '12em',
            'font-weight': '300 !important',
            'letter-spacing': '-7px',
            'color': c.text,
        }),
        rule('.unlock-dialog-clock .unlock-dialog-clock-date', {
            'font-size': '1.75em',
            'font-weight': '500 !important',
            'color': c.text,
        }),
        rule('.unlock-dialog-clock .unlock-dialog-clock-hint', {
            'font-size': '1em',
            'font-weight': 'normal !important',
            'color': c.text2,
            'padding-top': '2em',
        }),

        // Avatar with a light ring, and the name under it.
        rule([
            '.unlock-dialog .user-widget .user-icon',
            '.unlock-dialog .user-widget.vertical .user-icon',
        ], {
            'border': `3px solid ${t.mode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.7)'}`,
            'border-radius': '999px',
            'box-shadow': t.shadow.e2,
        }),
        rule('.unlock-dialog .user-widget.vertical .user-icon StIcon', {color: c.text}),
        rule([
            '.unlock-dialog .user-widget-label',
            '.unlock-dialog .user-widget.vertical .user-widget-label',
            '.unlock-dialog .user-widget.horizontal .user-widget-label',
        ], {
            'font-size': '1.36em',
            'font-weight': '600',
            'color': c.text,
        }),

        // Password field: 340 x 46, radius 14, elevated glass. The width is
        // set on the centred layout that holds the field, not on the field,
        // so the field stays centred under the avatar. GNOME keeps an equal
        // slot either side of the field (cancel button, spinner), about 54 px
        // each, so the layout is 448 px for a 340 px field.
        rule('.unlock-dialog .login-dialog-prompt-layout', {
            'width': '448px',
        }),
        rule(entry, {
            'padding': '12px 16px',
            'border-radius': `${t.opts.rounded ? 14 : r.md}px`,
            'font-size': '1.09em',
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'box-shadow': t.shadow.e1,
        }),
        rule(`${entry}:hover`, {
            'color': c.text,
            'background-color': c.elev,
            'border-color': c.borderStrong,
        }),
        rule(`${entry}:focus`, {
            'color': c.text,
            'background-color': c.elev,
            'border-color': c.accent,
            'box-shadow': `0 0 0 3px ${c.accentSoft} !important`,
        }),
        rule(`${entry} StLabel.hint-text`, {color: c.text3}),
        rule(`${entry} StIcon.capslock-warning`, {color: c.amber}),

        // Messages under the field.
        rule('.unlock-dialog .login-dialog-message-hint', {
            'color': c.text2,
            'font-size': '0.9em',
        }),
        rule([
            '.unlock-dialog .login-dialog-message-warning',
            '.unlock-dialog .caps-lock-warning-label',
        ], {
            'color': c.red,
            'background-color': c.elev,
            'border-radius': `${r.sm}px`,
            'padding': '3px 10px',
            'font-weight': '500',
        }),

        // Round glass buttons: switch user, login options, cancel.
        rule(button, {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': '999px',
            'padding': '12px',
            'transition-duration': `${t.t.fast}ms`,
        }),
        rule(st(':hover'), {'color': c.text, 'background-color': c.cardOn}),
        rule(st(':active'), {'color': c.text, 'background-color': c.cardOn}),
        rule(st(':focus'), {'box-shadow': `inset 0 0 0 2px ${c.accent} !important`}),

        // Notifications waiting on the lock screen.
        rule('.unlock-dialog-notifications-container .unlock-dialog-notification-source', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.lg}px`,
        }),

        // The top bar stays transparent; its text follows the mode.
        rule(['#panel.unlock-screen .panel-button', '#panel.unlock-screen .panel-button .system-status-icon'], {
            color: `${c.text} !important`,
        }),
    ]);
}
