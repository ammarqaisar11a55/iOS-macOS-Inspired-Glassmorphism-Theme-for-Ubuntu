// Puts the lock screen's date above its time, as in the design.
//
// GNOME builds the clock as time, date, hint. The stylesheet cannot change
// that order, so this moves the date label above the time label whenever a
// lock screen is built, and moves it back when the style is turned off.
// Only the order of two labels GNOME already created is changed.

import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SIGNALS = ['active-changed', 'locked-changed', 'lock-screen-shown'];

function find(actor, styleClass) {
    if (actor.has_style_class_name?.(styleClass))
        return actor;
    for (const child of actor.get_children()) {
        const found = find(child, styleClass);
        if (found)
            return found;
    }
    return null;
}

export class LockScreenManager {
    constructor() {
        this._wanted = false;
        this._idleId = 0;
        this._signalIds = SIGNALS.map(name => Main.screenShield?.connect(name, () => this._queue()))
            .filter(Boolean);
    }

    _queue() {
        if (this._idleId)
            return;
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._idleId = 0;
            this._apply();
            return GLib.SOURCE_REMOVE;
        });
    }

    _apply() {
        const group = Main.layoutManager.screenShieldGroup;
        const clock = group ? find(group, 'unlock-dialog-clock') : null;
        if (!clock)
            return;
        const time = clock.get_children().find(c => c.has_style_class_name?.('unlock-dialog-clock-time'));
        const date = clock.get_children().find(c => c.has_style_class_name?.('unlock-dialog-clock-date'));
        if (!time || !date)
            return;
        if (this._wanted)
            clock.set_child_below_sibling(date, time);
        else
            clock.set_child_above_sibling(date, time);
    }

    /**
     * @param {boolean} dateFirst - whether the date should sit above the time
     */
    sync(dateFirst) {
        this._wanted = dateFirst;
        this._apply();
    }

    destroy() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
        for (const id of this._signalIds)
            Main.screenShield.disconnect(id);
        this._signalIds = [];
        this.sync(false);
    }
}
