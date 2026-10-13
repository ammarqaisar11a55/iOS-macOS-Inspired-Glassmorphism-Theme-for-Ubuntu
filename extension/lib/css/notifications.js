// Notification banners, the notification list and the calendar popover.

import {rule, section, edge, focusRing} from './util.js';

/**
 * @param {object} t - resolved tokens
 * @returns {string} CSS for notifications and the date menu
 */
export function notificationsCss(t) {
    const {c, r} = t;
    const cards = ['.message', '.events-button', '.world-clocks-button', '.weather-button'];
    const st = s => cards.map(x => `${x}${s}`);
    const inner = Math.max(r.xl - 10, r.sm);

    return section('Notifications and calendar', [
        // The date menu popover is the elevated panel; everything inside it
        // is a secondary-glass card.
        rule('.popup-menu-content.datemenu-popover', {
            'background-color': c.elev,
            'color': c.text,
            'border': edge(c.border),
            'border-radius': `${r.xl}px`,
            'box-shadow': t.shadow.e3,
            'padding': '10px',
        }),
        rule(cards, {
            'color': c.text,
            'background-color': c.card,
            'border': edge(c.borderSoft),
            'border-radius': `${inner}px`,
            'transition-duration': `${t.t.fast}ms`,
        }),
        rule(st(':hover'), {color: c.text, 'background-color': c.sel}),
        rule(st(':active'), {color: c.text, 'background-color': c.cardOn}),
        rule(st(':focus'), {
            'color': c.text,
            'background-color': c.sel,
            'box-shadow': focusRing(t),
        }),
        rule('.message:second-in-stack', {'background-color': c.card}),
        rule('.message-view .message', {'border-radius': `${inner}px`}),
        rule('.message-list', {'border-color': c.borderSoft}),
        rule('.message-list .message-list-placeholder', {color: c.text3}),
        rule([
            '.message .message-header .message-header-content .message-source-title',
            '.message .message-header .message-header-content .event-time',
            '.message .message-body',
        ], {color: c.text2}),
        rule('.message .message-title', {color: c.text}),

        // A banner floats on its own, so it takes the elevated material.
        rule('.notification-banner', {
            'color': c.text,
            'background-color': c.elev,
            'border': edge(c.border),
            'border-radius': `${r.lg}px`,
            'box-shadow': t.shadow.e3,
        }),
        rule(['.notification-banner:hover', '.notification-banner:focus'], {
            'background-color': c.elev,
        }),

        // Calendar.
        rule(['.calendar', '.datemenu-today-button'], {color: c.text}),
        rule('.datemenu-today-button', {'border-radius': `${inner}px`}),
        rule('.datemenu-today-button:hover', {'background-color': c.sel}),
        rule('.datemenu-today-button .date-label', {color: c.text2}),
        rule('.calendar .calendar-month-header .calendar-month-label', {
            color: `${c.text} !important`,
        }),
        rule('.calendar .calendar-day-heading', {
            'color': c.text3,
            'background-color': 'transparent',
        }),
        rule('.calendar .calendar-month-header .pager-button', {
            'color': c.text,
            'background-color': c.ctl,
        }),
        rule('.calendar .calendar-month-header .pager-button:hover', {
            'background-color': c.cardOn,
        }),
        rule('.calendar .calendar-month-header .calendar-month-label', {
            'background-color': 'transparent',
        }),
        rule('.calendar .calendar-day', {
            'color': c.text,
            'background-color': 'transparent',
            'border-radius': `${r.sm}px`,
        }),
        rule(['.calendar .calendar-day:hover', '.calendar .calendar-day:focus'], {
            'background-color': c.sel,
        }),
        rule('.calendar .calendar-day:selected', {
            'color': c.text,
            'background-color': c.cardOn,
        }),
        rule([
            '.calendar .calendar-day.calendar-today',
            '.calendar .calendar-day.calendar-today:hover',
            '.calendar .calendar-day.calendar-today:selected',
        ], {
            'color': c.onAccent,
            'background-color': c.accent,
        }),
        rule([
            '.calendar .calendar-other-month',
            '.calendar .calendar-week-number',
        ], {
            'color': c.text3,
            'background-color': 'transparent',
        }),
        rule('.events-button .events-box .events-list .event-box .event-time', {
            color: c.text2,
        }),
    ]);
}
