/* exported init */

const { GObject, Gio, St, Clutter } = imports.gi

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const ExtensionUtils = imports.misc.extensionUtils
const _ = ExtensionUtils.gettext

const Me = ExtensionUtils.getCurrentExtension()

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async')

async function cmd(argv, cancellable = null) {
  const flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  const proc = new Gio.Subprocess({ argv: argv, flags: flags })
  proc.init(cancellable)

  const cancel_id = cancellable ? cancellable.connect(() => proc.force_exit()) : 0

  try {
    const [out, err] = await proc.communicate_utf8_async(null, null)
    const status = proc.get_exit_status()
    if (status !== 0) {
      throw new Gio.IOErrorEnum({
        code: Gio.IOErrorEnum.FAILED,
        message: err.trim()
          ? err.trim()
          : `Command '${argv.join(' ')}' failed with exit code ${status}`,
      })
    }
    return out.trim()
  } finally {
    if (cancel_id > 0) {
      cancellable.disconnect(cancel_id)
    }
  }
}

const TrayWidget = GObject.registerClass(
  {},
  class TrayWidget extends St.Button {
    #indicator
    #command

    constructor(indicator, command, icon_name) {
      super({
        child: new St.Icon({ icon_name: icon_name }),
        style_class: 'panel-button system-status-icon',
      })
      this.#indicator = indicator
      this.#command = command
    }

    vfunc_event(event) {
      if (
        event.type() === Clutter.EventType.TOUCH_END ||
        event.type() === Clutter.EventType.BUTTON_RELEASE
      ) {
        this.#pressed()
        return Clutter.EVENT_STOP
      }
      return Clutter.EVENT_PROPAGATE
    }

    #pressed() {
      this.show_menu().catch((err) => logError(err))
    }

    async show_menu() {
      const promise = cmd(['pgrep', this.#command])
      this.#indicator.menu.close()
      const output = await promise
      const pid = output.split('\n')[0]
      if (!pid) throw new Error(`Could not find process: ${this.#command}`)
      await cmd(['kill', '-USR1', pid])
    }
  },
)

const Indicator = GObject.registerClass(
  {},
  class Indicator extends PanelMenu.Button {
    #icon
    #widgets

    constructor() {
      super(0.0, Me.metadata.name)

      this.#icon = new St.Icon({
        icon_name: 'view-grid-symbolic',
        style_class: 'system-status-icon qubes-tray-widgets-indicator',
      })
      this.add_child(this.#icon)

      this.#widgets = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
      })
      this.menu.addMenuItem(this.#widgets)
      this.menu.actor.add_style_class_name('qubes-tray-widgets-menu')

      this.#setup_widgets()
    }

    #setup_widgets() {
      this.#widget('qui-clipboard', 'edit-copy')
      this.#widget('qui-devices', 'qubes-devices')
      this.#widget('qui-disk-space', 'drive-harddisk')
      this.#widget('qui-domains', 'qui-domains-scalable')
      this.#widget('qui-updates', 'software-update-available')
    }

    #widget(command, icon_name) {
      const widget = new TrayWidget(this, command, icon_name)
      this.#widgets.add_child(widget)
    }
  },
)

class Extension {
  #indicator

  constructor() {
    ExtensionUtils.initTranslations()
  }

  enable() {
    this.#indicator = new Indicator()
    Main.panel.addToStatusArea(Me.metadata.uuid, this.#indicator)
  }

  disable() {
    this.#indicator.destroy()
    this.#indicator = null
  }
}

function init() {
  return new Extension()
}
