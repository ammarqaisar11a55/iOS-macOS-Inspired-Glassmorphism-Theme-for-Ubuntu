// Ubuntu Glass: entry point.
//
// The extension owns no visuals of its own. It reads the settings, resolves
// them into design tokens, and hands the result to small managers that each
// control one mechanism: the shell stylesheet, background blur, the dock
// layout, GTK stylesheets, the terminal profile, and the desktop settings
// (wallpaper, icons, mode).

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Backup} from './lib/backup.js';
import {BlurManager} from './lib/blurManager.js';
import {DesktopManager} from './lib/desktopManager.js';
import {DockManager} from './lib/dockManager.js';
import {GtkManager} from './lib/gtkManager.js';
import {GlassIndicator} from './lib/indicator.js';
import {StyleManager} from './lib/styleManager.js';
import {TerminalManager} from './lib/terminalManager.js';
import {buildShellCss} from './lib/css/index.js';
import {buildGtk3Css, buildGtk4Css} from './lib/css/gtk.js';
import {buildTerminalPalette, terminalOpacity} from './lib/css/terminal.js';
import {STYLE_KEYS, isPresetKey, matchPreset, readAll} from './lib/model.js';
import {BLUR_RADIUS} from './lib/tokens.js';

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const STYLE_DELAY_MS = 40;

// Shell.BlurEffect's radius is twice the Gaussian sigma the design specifies.
const BLUR_SCALE = 2;

export default class UbuntuGlassExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._iface = new Gio.Settings({schema_id: INTERFACE_SCHEMA});

        this._backup = new Backup(this._settings);
        this._style = new StyleManager();
        this._blur = new BlurManager();
        this._dock = new DockManager(this._backup);
        this._gtk = new GtkManager();
        this._terminal = new TerminalManager(this._backup);
        this._desktop = new DesktopManager(this._backup, this._iface, this.path);
        this._indicator = null;
        this._styleSourceId = 0;

        this._signals = [
            [this._settings, this._settings.connect('changed', (_s, key) => this._onChanged(key))],
            [this._iface, this._iface.connect('changed::color-scheme', () => this._onSchemeChanged())],
            [this._iface, this._iface.connect('changed::accent-color', () => this._queueStyle())],
            [this._iface, this._iface.connect('changed::enable-animations', () => this._queueStyle())],
            [Main.sessionMode, Main.sessionMode.connect('updated', () => this._syncBlur())],
        ];
        if (this._dock.settings) {
            this._signals.push([this._dock.settings,
                this._dock.settings.connect('changed', () => this._blur.rescan())]);
        }

        this._desktop.syncAppearance(this._settings.get_string('appearance'));
        this._desktop.syncWallpaper(this._settings.get_boolean('wallpaper'),
            this._settings.get_string('wallpaper-name'));
        this._desktop.syncIconTheme(this._settings.get_boolean('icon-theme'));
        this._syncDock();
        this._syncStyle();
        this._syncBlur();
        this._syncIndicator();
    }

    disable() {
        // This extension also runs on the lock screen (see metadata.json) so
        // that the unlock dialog is themed and the wallpaper, dock layout and
        // GTK stylesheet are not torn down and rebuilt on every lock. Only the
        // stylesheet and a hidden Quick Settings item are active there.
        if (this._styleSourceId) {
            GLib.source_remove(this._styleSourceId);
            this._styleSourceId = 0;
        }
        for (const [object, id] of this._signals)
            object.disconnect(id);
        this._signals = [];

        this._indicator?.destroy();
        this._indicator = null;

        this._blur.destroy();
        this._style.destroy();
        this._gtk.destroy();
        this._terminal.destroy();
        this._dock.destroy();
        this._desktop.destroy();

        this._blur = this._style = this._gtk = this._terminal = this._dock = this._desktop = null;
        this._backup = null;
        this._iface = null;
        this._settings = null;
    }

    _mode() {
        const appearance = this._settings.get_string('appearance');
        return appearance === 'system' ? this._desktop.systemMode : appearance;
    }

    _env() {
        return {
            mode: this._mode(),
            systemAccent: this._desktop.systemAccent,
            systemAnimations: this._desktop.systemAnimations,
        };
    }

    _onChanged(key) {
        if (key === 'backup' || key === 'preset')
            return;

        // Changing a preset-controlled setting by hand turns the preset into
        // "Custom"; landing exactly on a preset's values selects it again.
        if (isPresetKey(key)) {
            const preset = matchPreset(readAll(this._settings));
            if (this._settings.get_string('preset') !== preset)
                this._settings.set_string('preset', preset);
        }

        if (STYLE_KEYS.includes(key) || key === 'window-style' || key === 'terminal-style')
            this._queueStyle();

        switch (key) {
        case 'appearance':
            this._desktop.syncAppearance(this._settings.get_string('appearance'));
            break;
        case 'wallpaper':
        case 'wallpaper-name':
            this._desktop.syncWallpaper(this._settings.get_boolean('wallpaper'),
                this._settings.get_string('wallpaper-name'));
            break;
        case 'icon-theme':
            this._desktop.syncIconTheme(this._settings.get_boolean('icon-theme'));
            break;
        case 'dock-style':
        case 'dock-animations':
        case 'reduced-motion':
            this._syncDock();
            this._syncBlur();
            break;
        case 'glass-effects':
        case 'background-blur':
        case 'blur-intensity':
        case 'panel-style':
            this._syncBlur();
            break;
        case 'show-indicator':
            this._syncIndicator();
            break;
        }
    }

    _onSchemeChanged() {
        // If the user picks a system style that contradicts a forced
        // appearance, their choice wins and the theme follows the system.
        const appearance = this._settings.get_string('appearance');
        if (!this._desktop.writingScheme && appearance !== 'system' &&
            appearance !== this._desktop.systemMode) {
            this._desktop.forgetAppearance();
            this._settings.set_string('appearance', 'system');
        }
        this._queueStyle();
    }

    _queueStyle() {
        if (this._styleSourceId)
            return;
        this._styleSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, STYLE_DELAY_MS, () => {
            this._styleSourceId = 0;
            this._syncStyle();
            return GLib.SOURCE_REMOVE;
        });
    }

    _syncStyle() {
        const values = readAll(this._settings);
        const env = this._env();
        this._style.apply(buildShellCss(values, env));
        this._gtk.sync(values['window-style']
            ? {gtk4: buildGtk4Css(values, env), gtk3: buildGtk3Css(values, env)}
            : null);
        this._terminal.sync(values['terminal-style']
            ? {palette: buildTerminalPalette(values, env), opacity: terminalOpacity(values, env)}
            : null);
    }

    _syncDock() {
        const reduced = this._settings.get_boolean('reduced-motion');
        this._dock.sync({
            floating: this._settings.get_boolean('dock-style'),
            animations: this._settings.get_boolean('dock-animations') && !reduced,
        });
    }

    _syncBlur() {
        const s = this._settings;
        const on = s.get_boolean('glass-effects') && s.get_boolean('background-blur');
        const radius = on ? Math.round(BLUR_RADIUS * BLUR_SCALE * s.get_int('blur-intensity') / 100) : 0;
        this._blur.sync({
            // The lock screen draws its own blurred wallpaper under a
            // transparent bar, so the bar is not blurred a second time there.
            panel: s.get_boolean('panel-style') && !Main.sessionMode.isLocked,
            dock: s.get_boolean('dock-style'),
            radius,
        });
    }

    _syncIndicator() {
        const wanted = this._settings.get_boolean('show-indicator');
        if (wanted && !this._indicator) {
            this._indicator = new GlassIndicator(this);
        } else if (!wanted && this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
