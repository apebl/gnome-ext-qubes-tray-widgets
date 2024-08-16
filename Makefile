UUID := qubes-tray-widgets@a.pebl.cc
DESTDIR := ${HOME}/.local/share

build:
	glib-compile-schemas --strict --targetdir=$(UUID)/schemas/ $(UUID)/schemas

install:
	mkdir -p $(DESTDIR)/gnome-shell/extensions
	cp -ar $(UUID) $(DESTDIR)/gnome-shell/extensions/$(UUID)
