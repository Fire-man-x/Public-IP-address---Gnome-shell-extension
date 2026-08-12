import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const IP_VERSIONS = [
    { key: 'both', label: 'Both IPv4 and IPv6' },
    { key: 'ipv4', label: 'IPv4 only' },
    { key: 'ipv6', label: 'IPv6 only' },
];

export default class PublicIPPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({title: _('General')});
        page.add(group);

        // Which addresses to show
        const ipVersionRow = new Adw.ComboRow({
            title: _('Show'),
            subtitle: _('Which addresses to display in the panel menu'),
            model: Gtk.StringList.new(IP_VERSIONS.map(v => _(v.label))),
            selected: Math.max(0, IP_VERSIONS.findIndex(v => v.key === settings.get_string('ip-version'))),
        });
        ipVersionRow.connect('notify::selected', row => {
            const version = IP_VERSIONS[row.selected];
            if (version && version.key !== settings.get_string('ip-version'))
                settings.set_string('ip-version', version.key);
        });
        group.add(ipVersionRow);
    }
}
