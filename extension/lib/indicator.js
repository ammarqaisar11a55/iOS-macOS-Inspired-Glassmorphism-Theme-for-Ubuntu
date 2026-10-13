// The Glass tile in Quick Settings: a master switch for the glass material,
// the presets, and the way into Glass Theme Settings.

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {PRESETS, applyPreset} from './model.js';

const GlassToggle = GObject.registerClass(
class GlassToggle extends QuickSettings.QuickMenuToggle {
    constructor(extension) {
        const gicon = Gio.icon_new_for_string(
            extension.dir.get_child('icons').get_child('ubuntu-glass-symbolic.svg').get_path());
        super({
            title: 'Glass',
            gicon,
            toggleMode: true,
        });

        this._settings = extension.getSettings();
        this._settings.bind('glass-effects', this, 'checked', Gio.SettingsBindFlags.DEFAULT);

        this.menu.setHeader(gicon, 'Ubuntu Glass', 'Theme presets');

        this._presetItems = new Map();
        for (const [id, preset] of Object.entries(PRESETS)) {
            const item = new PopupMenu.PopupMenuItem(preset.title);
            item.connect('activate', () => applyPreset(this._settings, id));
            this.menu.addMenuItem(item);
            this._presetItems.set(id, item);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._settingsItem = this.menu.addAction('Glass Theme Settings', () => {
            Main.panel.closeQuickSettings?.();
            extension.openPreferences();
        });

        this._presetId = this._settings.connect('changed::preset', () => this._syncPreset());
        this._sessionId = Main.sessionMode.connect('updated', () => this._syncSession());
        this._syncPreset();
        this._syncSession();

        this.connect('destroy', () => {
            this._settings.disconnect(this._presetId);
            Main.sessionMode.disconnect(this._sessionId);
            this._settings = null;
        });
    }

    _syncPreset() {
        const current = this._settings.get_string('preset');
        for (const [id, item] of this._presetItems) {
            item.setOrnament(id === current
                ? PopupMenu.Ornament.CHECK
                : PopupMenu.Ornament.NONE);
        }
        this.subtitle = PRESETS[current]?.title ?? 'Custom';
    }

    // Preferences cannot be opened from the lock screen.
    _syncSession() {
        this._settingsItem.visible = Main.sessionMode.allowSettings;
    }
});

export const GlassIndicator = GObject.registerClass(
class GlassIndicator extends QuickSettings.SystemIndicator {
    constructor(extension) {
        super();
        this.quickSettingsItems.push(new GlassToggle(extension));
        Main.panel.statusArea.quickSettings.addExternalIndicator(this);
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});
