// Background blur for the top bar and the dock.
//
// Uses Shell.BlurEffect in background mode, the same supported effect GNOME
// uses for the lock screen. The effect is attached to actors the shell
// already owns and is removed again on disable; nothing is patched.

import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const EFFECT_NAME = 'ubuntu-glass-blur';
const DOCK_CONTAINER = 'dashtodockContainer';
const DOCK_BACKGROUND_CLASS = 'dash-background';

function findByStyleClass(actor, styleClass) {
    if (actor.has_style_class_name?.(styleClass))
        return actor;
    for (const child of actor.get_children()) {
        const found = findByStyleClass(child, styleClass);
        if (found)
            return found;
    }
    return null;
}

export class BlurManager {
    constructor() {
        this._actors = new Map();
        this._state = {panel: false, dock: false, radius: 0};
        this._rescanId = 0;

        // Docks are rebuilt whenever their settings or the monitors change.
        this._childAddedId = Main.uiGroup.connect('child-added', () => this._queueRescan());
    }

    _queueRescan() {
        if (this._rescanId)
            return;
        this._rescanId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._rescanId = 0;
            this._apply();
            return GLib.SOURCE_REMOVE;
        });
    }

    _attach(actor, radius) {
        let entry = this._actors.get(actor);
        if (!entry) {
            const effect = new Shell.BlurEffect({
                mode: Shell.BlurMode.BACKGROUND,
                brightness: 1.0,
            });
            actor.add_effect_with_name(EFFECT_NAME, effect);
            const destroyId = actor.connect('destroy', () => this._actors.delete(actor));
            entry = {effect, destroyId};
            this._actors.set(actor, entry);
        }
        // GNOME 46 names the strength `sigma`; later versions use `radius`.
        if ('radius' in entry.effect)
            entry.effect.radius = radius;
        else
            entry.effect.sigma = radius / 2;
        entry.effect.queue_repaint?.();
    }

    _detach(actor) {
        const entry = this._actors.get(actor);
        if (!entry)
            return;
        actor.disconnect(entry.destroyId);
        actor.remove_effect(entry.effect);
        this._actors.delete(actor);
    }

    _targets() {
        const targets = [];
        if (this._state.panel && Main.panel)
            targets.push(Main.panel);
        if (this._state.dock) {
            for (const child of Main.uiGroup.get_children()) {
                if (child.name !== DOCK_CONTAINER)
                    continue;
                const background = findByStyleClass(child, DOCK_BACKGROUND_CLASS);
                if (background)
                    targets.push(background);
            }
        }
        return targets;
    }

    _apply() {
        const wanted = this._state.radius > 0 ? this._targets() : [];
        for (const actor of [...this._actors.keys()]) {
            if (!wanted.includes(actor))
                this._detach(actor);
        }
        for (const actor of wanted)
            this._attach(actor, this._state.radius);
    }

    /**
     * @param {object} state
     * @param {boolean} state.panel - blur behind the top bar
     * @param {boolean} state.dock - blur behind the dock
     * @param {number} state.radius - blur radius in pixels; 0 disables blur
     */
    sync(state) {
        this._state = {...state};
        this._apply();
    }

    /** Re-check which dock actors exist, e.g. after the dock was rebuilt. */
    rescan() {
        this._queueRescan();
    }

    destroy() {
        if (this._rescanId) {
            GLib.source_remove(this._rescanId);
            this._rescanId = 0;
        }
        if (this._childAddedId) {
            Main.uiGroup.disconnect(this._childAddedId);
            this._childAddedId = 0;
        }
        for (const actor of [...this._actors.keys()])
            this._detach(actor);
    }
}
