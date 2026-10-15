// Two lock screen details the stylesheet cannot reach:
//
// - GNOME builds the clock as time, date, hint; the design puts the date
//   above the time. The date label is moved above the time label whenever a
//   lock screen is built, and moved back when the style is turned off.
// - GNOME dims the blurred wallpaper to 65% brightness, which turns the
//   light design's paper tint grey. In light mode the blur is brightened;
//   GNOME's own value is recorded first and put back afterwards.
//
// Only the order of two labels and the brightness of an effect GNOME already
// created are changed.

import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SIGNALS = ['active-changed', 'locked-changed', 'lock-screen-shown', 'wake-up-screen'];

// Blur brightness behind the light lock screen.
const LIGHT_BRIGHTNESS = 0.95;

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
        this._light = false;
        this._original = new Map();
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

    _applyBrightness(actor) {
        const effect = actor.get_effect?.('blur');
        if (effect && 'brightness' in effect) {
            if (this._light) {
                if (!this._original.has(effect))
                    this._original.set(effect, effect.brightness);
                effect.brightness = LIGHT_BRIGHTNESS;
            } else if (this._original.has(effect)) {
                effect.brightness = this._original.get(effect);
                this._original.delete(effect);
            }
        }
        actor.get_children().forEach(child => this._applyBrightness(child));
    }

    _apply() {
        const group = Main.layoutManager.screenShieldGroup;
        if (group)
            this._applyBrightness(group);
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
     * @param {boolean} [light] - whether to brighten the blur for light mode
     */
    sync(dateFirst, light = false) {
        this._wanted = dateFirst;
        this._light = dateFirst && light;
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
        this.sync(false, false);
        this._original.clear();
    }
}
