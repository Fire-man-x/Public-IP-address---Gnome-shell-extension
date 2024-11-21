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

export default class PublicIPIndicatorExtension extends Extension {

	panelMenuButton = null

	constructor(metadata) {
		super(metadata);
	}

	enable() {

		//panelMenuButton
		this.panelMenuButton = new PanelMenu.Button(0.0, this.metadata.name, false); // 3rd-param - false => create menu
		this.panelMenuButton.menu.connect('open-state-changed', (actor, event) => {
			this.panelMenuButton.menu.removeAll();

			let menuItem;
			menuItem = new PublicIpPopupMenuItem("IPv4:");
			this.panelMenuButton.menu.addMenuItem(menuItem);
			menuItem = new PublicIpPopupMenuItem("IPv6:");
			this.panelMenuButton.menu.addMenuItem(menuItem);
		});
		const label = new St.Label({
			text: 'IP',
			y_align: Clutter.ActorAlign.CENTER
		});
		this.panelMenuButton.add_child(label);
		this.panelMenuButton.setSensitive(true);

		Main.panel.addToStatusArea(this.metadata.uuid, this.panelMenuButton);


		//must be here for initialize menu
		this.panelMenuButton.menu.addMenuItem(new PopupMenu.PopupMenuItem("Dummy"));
	}

	disable() {
		this.panelMenuButton.destroy();
		this.panelMenuButton = null;
	}
}


const PublicIpPopupMenuItem = GObject.registerClass(
class PublicIpPopupMenuItem extends PopupMenu.PopupMenuItem {
	constructor(label) {
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
		this._refreshIP();
	}

	async _refreshIP() {
		try {
			let message = null;
			if(this.label.text === 'IPv6:'){
				//message = Soup.Message.new('GET', 'https://api64.ipify.org?format=json');
				message = Soup.Message.new('GET', 'https://ipv6.lookup.test-ipv6.com/ip/?testdomain=test-ipv6.cz&testname=test_asn6');
			} else {
				//message = Soup.Message.new('GET', 'https://api.ipify.org?format=json');
				message = Soup.Message.new('GET', 'https://ipv4.lookup.test-ipv6.com/ip/?testdomain=test-ipv6.cz&testname=test_asn4');
			}

			// Použití send_and_read_async s asynchronním čtením
			let response = await this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

			if (message.get_status() === Soup.Status.OK) {
				/** @var responseData Uint8Array  */
				let responseData = response.get_data();
				responseData = new TextDecoder().decode(responseData);
				const json = JSON.parse(responseData);
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