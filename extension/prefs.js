// Glass Theme Settings: the preferences window.
//
// Every control here is bound to a key in the settings model, and the
// extension reacts to the key, so a switch that is shown always does
// something. Controls for features that are not installed are shown
// insensitive, with the reason in their subtitle.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {iconThemeInstalled} from './lib/desktopManager.js';
import {terminalAvailable} from './lib/terminalManager.js';
import {
    ALL_ON, DECORATIVE_OFF, PRESETS,
    applyPreset, exportSettings, importSettings, readAll, restoreDefaults, writeAll,
} from './lib/model.js';
import {ACCENTS, WALLPAPERS} from './lib/tokens.js';

const DOCK_SCHEMA = 'org.gnome.shell.extensions.dash-to-dock';

function dockInstalled() {
    return Gio.SettingsSchemaSource.get_default().lookup(DOCK_SCHEMA, true) !== null;
}

export default class UbuntuGlassPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const ui = new PreferencesBuilder(window, settings);

        window.set_title('Glass Theme Settings');
        window.set_search_enabled(true);
        window.add(ui.appearancePage());
        window.add(ui.componentsPage());
        window.add(ui.desktopPage());
        window.add(ui.accessibilityPage());
        window.add(ui.managePage());
    }
}

class PreferencesBuilder {
    constructor(window, settings) {
        this._window = window;
        this._settings = settings;
    }

    // --- Row helpers -------------------------------------------------------

    _page(title, iconName) {
        return new Adw.PreferencesPage({title, icon_name: iconName});
    }

    _group(page, title, description = null) {
        const group = new Adw.PreferencesGroup({title, description});
        page.add(group);
        return group;
    }

    _switch(group, key, title, subtitle = null) {
        const row = new Adw.SwitchRow({title, subtitle});
        this._settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
        return row;
    }

    _percent(group, key, title, subtitle) {
        const row = new Adw.SpinRow({
            title,
            subtitle,
            adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 5, page_increment: 20}),
        });
        this._settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
        return row;
    }

    // A combo row over an enum key. `options` is a list of [id, label].
    _choice(group, key, title, subtitle, options) {
        const row = new Adw.ComboRow({
            title,
            subtitle,
            model: Gtk.StringList.new(options.map(([, label]) => label)),
        });
        const ids = options.map(([id]) => id);
        const fromSettings = () => {
            const index = ids.indexOf(this._settings.get_string(key));
            if (index >= 0 && row.selected !== index)
                row.selected = index;
        };
        fromSettings();
        row.connect('notify::selected', () => {
            const id = ids[row.selected];
            if (id && this._settings.get_string(key) !== id)
                this._settings.set_string(key, id);
        });
        const handler = this._settings.connect(`changed::${key}`, fromSettings);
        row.connect('destroy', () => this._settings.disconnect(handler));
        group.add(row);
        return row;
    }

    _button(group, title, subtitle, label, callback, cssClass = null) {
        const row = new Adw.ActionRow({title, subtitle});
        const button = new Gtk.Button({label, valign: Gtk.Align.CENTER});
        if (cssClass)
            button.add_css_class(cssClass);
        button.connect('clicked', callback);
        row.add_suffix(button);
        row.set_activatable_widget(button);
        group.add(row);
        return row;
    }

    // Make `row` usable only while every key in `keys` is on.
    _dependsOn(row, ...keys) {
        const update = () => {
            row.sensitive = keys.every(k => this._settings.get_boolean(k));
        };
        update();
        const handlers = keys.map(k => this._settings.connect(`changed::${k}`, update));
        row.connect('destroy', () => handlers.forEach(h => this._settings.disconnect(h)));
    }

    _unavailable(row, reason) {
        row.sensitive = false;
        row.subtitle = reason;
    }

    _toast(text) {
        this._window.add_toast(new Adw.Toast({title: text, timeout: 3}));
    }

    // --- Pages -------------------------------------------------------------

    appearancePage() {
        const page = this._page('Appearance', 'applications-graphics-symbolic');

        const presets = this._group(page, 'Presets',
            'A preset changes the glass settings below. It leaves your wallpaper, icons, accent colour and component choices alone.');
        const checks = new Map();
        for (const [id, preset] of Object.entries(PRESETS)) {
            const row = new Adw.ActionRow({
                title: preset.title,
                subtitle: preset.description,
                activatable: true,
            });
            const check = new Gtk.Image({icon_name: 'object-select-symbolic'});
            row.add_suffix(check);
            row.connect('activated', () => applyPreset(this._settings, id));
            presets.add(row);
            checks.set(id, check);
        }
        const syncPreset = () => {
            const current = this._settings.get_string('preset');
            for (const [id, check] of checks)
                check.opacity = id === current ? 1 : 0;
            presets.description = current === 'custom'
                ? 'Custom settings are in use. Choosing a preset replaces the glass settings below.'
                : 'A preset changes the glass settings below. It leaves your wallpaper, icons, accent colour and component choices alone.';
        };
        syncPreset();
        const presetHandler = this._settings.connect('changed::preset', syncPreset);
        presets.connect('destroy', () => this._settings.disconnect(presetHandler));

        const glass = this._group(page, 'Glass');
        this._switch(glass, 'glass-effects', 'Glassmorphism effects',
            'Translucent glass surfaces. When off, surfaces use solid colours.');
        const transparency = this._switch(glass, 'transparency', 'Transparency',
            'Let the wallpaper show through. When off, surfaces are almost opaque.');
        const intensity = this._percent(glass, 'glass-intensity', 'Glass intensity',
            'How translucent the glass is. 100 is the designed value.');
        const blur = this._switch(glass, 'background-blur', 'Background blur',
            'Blur the desktop behind the top bar and the dock.');
        const blurIntensity = this._percent(glass, 'blur-intensity', 'Blur intensity',
            'Strength of the blur. 100 is the designed value.');
        this._dependsOn(transparency, 'glass-effects');
        this._dependsOn(intensity, 'glass-effects');
        this._dependsOn(blur, 'glass-effects');
        this._dependsOn(blurIntensity, 'glass-effects', 'background-blur');

        const detail = this._group(page, 'Detail');
        this._switch(detail, 'glass-borders', 'Glass borders',
            'The hairline edge around glass surfaces.');
        this._switch(detail, 'shadows', 'Shadows and elevation',
            'Drop shadows under panels, menus and dialogs.');
        this._switch(detail, 'rounded-corners', 'Rounded corners',
            'The theme\'s radius scale. When off, a small uniform radius is used.');

        const colour = this._group(page, 'Colour');
        this._choice(colour, 'appearance', 'Appearance',
            'Dark and Light also switch the system style. Follow system leaves it alone.',
            [['system', 'Follow system'], ['dark', 'Dark'], ['light', 'Light']]);
        this._choice(colour, 'accent', 'Accent colour',
            'Used for active and selected states.',
            [...Object.entries(ACCENTS).map(([id, a]) => [id, a.name]), ['system', 'Follow system']]);

        return page;
    }

    componentsPage() {
        const page = this._page('Components', 'view-grid-symbolic');

        const shell = this._group(page, 'Desktop shell',
            'Turning a component off restores its standard look and leaves the others as they are.');
        this._switch(shell, 'panel-style', 'Top bar',
            'Translucent top bar with rounded hover states.');
        this._switch(shell, 'quick-settings-style', 'Quick settings',
            'Glass panel with tiles and accent icon discs.');
        this._switch(shell, 'notifications-style', 'Notifications and calendar',
            'Glass banners, notification list and calendar.');
        this._switch(shell, 'menus-style', 'Menus and tooltips',
            'Popup menus, tooltips, switches and sliders.');
        this._switch(shell, 'dialogs-style', 'Dialogs and overlays',
            'System dialogs, volume and brightness overlays, the window switcher and the lock screen.');
        this._switch(shell, 'overview-style', 'Overview and search',
            'Search field, app grid and search results.');

        const dock = this._group(page, 'Dock');
        const dockRow = this._switch(dock, 'dock-style', 'Floating glass dock',
            'Moves the dock to the bottom as a floating glass bar. Your previous dock layout is restored when this is off.');
        const dockAnimations = this._switch(dock, 'dock-animations', 'Dock animations',
            'Hover and show/hide transitions.');
        if (dockInstalled()) {
            this._dependsOn(dockAnimations, 'dock-style');
        } else {
            this._unavailable(dockRow, 'Unavailable: Ubuntu Dock or Dash to Dock is not installed.');
            this._unavailable(dockAnimations, 'Unavailable: Ubuntu Dock or Dash to Dock is not installed.');
        }

        const apps = this._group(page, 'Applications');
        this._switch(apps, 'window-style', 'Window styling',
            'Colours, corner radius and window controls for GTK applications. Applications pick the change up when they are next started.');
        const terminal = this._switch(apps, 'terminal-style', 'Glass terminal',
            'The theme\'s palette and translucency for the default Ptyxis profile. Your previous palette is restored when this is off.');
        if (!terminalAvailable())
            this._unavailable(terminal, 'Unavailable: the Ptyxis terminal is not installed.');

        return page;
    }

    desktopPage() {
        const page = this._page('Desktop', 'user-desktop-symbolic');

        const wallpaper = this._group(page, 'Wallpaper');
        this._switch(wallpaper, 'wallpaper', 'Theme wallpaper',
            'Your current wallpaper is remembered and restored when this is off.');
        const picker = this._choice(wallpaper, 'wallpaper-name', 'Wallpaper', null,
            Object.entries(WALLPAPERS));
        this._dependsOn(picker, 'wallpaper');

        const icons = this._group(page, 'Icons');
        const iconRow = this._switch(icons, 'icon-theme', 'Ubuntu Glass icons',
            'Rounded app tiles for common applications. Your current icon theme is remembered and restored when this is off.');
        if (!iconThemeInstalled())
            this._unavailable(iconRow, 'Unavailable: the Ubuntu-Glass icon theme is not installed. Run install.sh to add it.');

        const entry = this._group(page, 'Quick settings');
        this._switch(entry, 'show-indicator', 'Glass tile',
            'Show the Glass tile, with presets and a shortcut to this window, in Quick Settings.');

        return page;
    }

    accessibilityPage() {
        const page = this._page('Accessibility', 'preferences-desktop-accessibility-symbolic');
        const group = this._group(page, 'Accessibility',
            'The theme also follows the system setting for reduced animation.');
        this._switch(group, 'reduced-motion', 'Reduced motion',
            'Remove the theme\'s transitions and dock animations.');
        this._switch(group, 'high-contrast', 'High contrast',
            'Stronger edges, full-strength secondary text and more opaque surfaces.');
        return page;
    }

    managePage() {
        const page = this._page('Manage', 'document-properties-symbolic');

        const quick = this._group(page, 'Quick actions');
        this._button(quick, 'Enable all supported effects',
            'Turns on every glass effect and every component.', 'Enable All', () => {
                writeAll(this._settings, {...ALL_ON, preset: 'full'});
                this._toast('All effects enabled');
            });
        this._button(quick, 'Disable optional decorative effects',
            'Turns off blur, transparency, borders, shadows and dock animations.', 'Disable', () => {
                writeAll(this._settings, DECORATIVE_OFF);
                this._toast('Decorative effects disabled');
            });

        const transfer = this._group(page, 'Import and export',
            'Preferences are saved as a JSON file. Unknown or invalid entries in an imported file are skipped.');
        this._button(transfer, 'Export preferences', null, 'Export…', () => this._export());
        this._button(transfer, 'Import preferences', null, 'Import…', () => this._import());

        const reset = this._group(page, 'Reset',
            'To switch the whole theme off, disable Ubuntu Glass in the Extensions app. That also restores your dock layout, wallpaper, icon theme and system style.');
        this._button(reset, 'Restore defaults',
            'Resets these preferences. Your other GNOME settings are not touched.',
            'Restore Defaults…', () => this._confirmReset(), 'destructive-action');

        return page;
    }

    // --- Actions -----------------------------------------------------------

    _jsonFilter() {
        const filter = new Gtk.FileFilter({name: 'JSON files'});
        filter.add_pattern('*.json');
        const filters = new Gio.ListStore({item_type: Gtk.FileFilter});
        filters.append(filter);
        return filters;
    }

    _export() {
        const dialog = new Gtk.FileDialog({
            title: 'Export preferences',
            initial_name: 'ubuntu-glass-settings.json',
            filters: this._jsonFilter(),
        });
        dialog.save(this._window, null, (source, result) => {
            let file;
            try {
                file = source.save_finish(result);
            } catch {
                return; // Cancelled.
            }
            try {
                const text = exportSettings(readAll(this._settings));
                file.replace_contents(new TextEncoder().encode(text), null, false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION, null);
                this._toast(`Exported to ${file.get_basename()}`);
            } catch (e) {
                this._toast(`Export failed: ${e.message}`);
            }
        });
    }

    _import() {
        const dialog = new Gtk.FileDialog({
            title: 'Import preferences',
            filters: this._jsonFilter(),
        });
        dialog.open(this._window, null, (source, result) => {
            let file;
            try {
                file = source.open_finish(result);
            } catch {
                return; // Cancelled.
            }
            try {
                const [, bytes] = GLib.file_get_contents(file.get_path());
                const {settings, skipped} = importSettings(new TextDecoder().decode(bytes));
                writeAll(this._settings, settings);
                this._toast(skipped.length
                    ? `Imported; skipped ${skipped.length} invalid ${skipped.length === 1 ? 'entry' : 'entries'}`
                    : 'Preferences imported');
            } catch (e) {
                this._toast(`Import failed: ${e.message}`);
            }
        });
    }

    _confirmReset() {
        const dialog = new Adw.AlertDialog({
            heading: 'Restore defaults?',
            body: 'All Glass Theme Settings return to their defaults. The theme wallpaper and icon theme are switched off, which restores the ones you had before.',
        });
        dialog.add_response('cancel', 'Cancel');
        dialog.add_response('reset', 'Restore Defaults');
        dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.set_default_response('cancel');
        dialog.set_close_response('cancel');
        dialog.connect('response', (_dialog, response) => {
            if (response !== 'reset')
                return;
            restoreDefaults(this._settings);
            this._toast('Defaults restored');
        });
        dialog.present(this._window);
    }
}
