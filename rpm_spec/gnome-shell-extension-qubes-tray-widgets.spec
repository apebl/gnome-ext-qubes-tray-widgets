%global uuid qubes-tray-widgets@a.pebl.cc
%global debug_package %{nil}

Name: gnome-shell-extension-qubes-tray-widgets
Version: 0.1.0
Release: %autorelease

Summary: Tray widgets for Qubes OS
License: GPLv2+
URL: https://github.com/apebl/gnome-ext-qubes-tray-widgets

Source0: %{name}-%{version}.tar.gz

BuildRequires: make
BuildRequires: %{_bindir}/glib-compile-schemas

Requires: gnome-shell-extension-common

%description
This extension adds tray widgets for Qubes OS

%prep
%setup -q

%build
make build

%install
make install DESTDIR=%{buildroot}%{_datadir}

%files
%license COPYING
%{_datadir}/gnome-shell/extensions/%{uuid}

%changelog
%autochangelog
