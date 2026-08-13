import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from "gi://GObject";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Soup from 'gi://Soup';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const IP_VERSIONS = {
	both: ['ipv4', 'ipv6'],
	ipv4: ['ipv4'],
	ipv6: ['ipv6'],
};

export default class PublicIPIndicatorExtension extends Extension {

	_settings = null
	_panelMenuButton = null
	_openStateChangedId = null

	constructor(metadata) {
		super(metadata);
	}

	enable() {
		this._settings = this.getSettings();

		//panelMenuButton
		this._panelMenuButton = new PanelMenu.Button(0.0, this.metadata.name, false); // 3rd-param - false => create menu
		this._openStateChangedId = this._panelMenuButton.menu.connect('open-state-changed', (actor, event) => {
			this._panelMenuButton.menu.removeAll();

			for (const version of IP_VERSIONS[this._settings.get_string('ip-version')]) {
				this._panelMenuButton.menu.addMenuItem(new PublicIpPopupMenuItem(version));
			}
		});
		const label = new St.Label({
			text: 'IP',
			y_align: Clutter.ActorAlign.CENTER
		});
		this._panelMenuButton.add_child(label);
		this._panelMenuButton.setSensitive(true);

		Main.panel.addToStatusArea(this.metadata.uuid, this._panelMenuButton);


		//must be here for initialize menu
		this._panelMenuButton.menu.addMenuItem(new PopupMenu.PopupMenuItem("Dummy"));
	}

	disable() {
		this._panelMenuButton.menu.disconnect(this._openStateChangedId);
		this._openStateChangedId = null;
		this._panelMenuButton.destroy();
		this._panelMenuButton = null;
		this._settings = null;
	}
}


const PublicIpPopupMenuItem = GObject.registerClass(
class PublicIpPopupMenuItem extends PopupMenu.PopupMenuItem {
	constructor(version) {
		const label = version === 'ipv6' ? 'IPv6:' : 'IPv4:';
		super(label);

		this.subLabel = new St.Label({
			text: _('Loading…'),
			y_align: Clutter.ActorAlign.CENTER
		});
		this.add_child(this.subLabel);

		this.connect('activate', (item, event) => {
			St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.subLabel.text);
		});

		this._httpSession = new Soup.Session();
		this._refreshIP(version);

		this.connect('destroy', () => {
			this._httpSession.abort();
			this._httpSession = null;
		});
	}

	async _refreshIP(version) {
		try {
			const message = Soup.Message.new(
				'GET',
				version === 'ipv6'
					? 'https://ipv6.lookup.test-ipv6.com/ip/?testdomain=test-ipv6.cz&testname=test_asn6'
					: 'https://ipv4.lookup.test-ipv6.com/ip/?testdomain=test-ipv6.cz&testname=test_asn4');

			// Use send_and_read_async with asynchronous reading
			let response = await this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

			if (message.get_status() === Soup.Status.OK) {
				/** @var responseData Uint8Array  */
				let responseData = response.get_data();
				responseData = new TextDecoder().decode(responseData);
				// remove "callback(" and last char ")"
				const jsonString = responseData.replace("callback(", "").replace("})", "}");
				const json = JSON.parse(jsonString);
				this.subLabel.text = json.ip;
			} else {
				this.subLabel.text = _('Error');
			}
		} catch (error) {
			if (error instanceof Gio.IOErrorEnum){
				this.subLabel.text = _('Unavailable');
			}
			else{
				this.subLabel.text = _('Error');
				console.log('Failed to get IP: ' + error);
			}
		}
	}
});
