#!/usr/bin/env python3
"""Install Nivo per user; preserve configuration and snapshot existing databases."""
import argparse
import datetime
import json
import os
from pathlib import Path
import shlex
import shutil
import sqlite3
import subprocess


def running_nivo_pids():
    """Defunct Electron children no longer hold files or a running company."""
    result = subprocess.run(
        ['pgrep', '-u', str(os.getuid()), '-x', 'frappe-books'],
        capture_output=True, text=True,
    )
    running = []
    for pid in result.stdout.split():
        try:
            state = Path(f'/proc/{int(pid)}/stat').read_text().rsplit(') ', 1)[1].split()[0]
        except FileNotFoundError:
            continue
        if state not in ('Z', 'X'):
            running.append(int(pid))
    return running


def install(source):
    home = Path.home()
    data_home = Path(os.environ.get('XDG_DATA_HOME', home / '.local/share'))
    applications = data_home / 'applications'
    target = data_home / 'nivo'
    config = Path(os.environ.get('XDG_CONFIG_HOME', home / '.config')) / 'frappe-books/config.json'
    if not source.is_file():
        raise SystemExit('AppImage not found: ' + str(source))
    if running_nivo_pids():
        raise SystemExit('Close Nivo before installing. Your files have not been changed.')
    target.mkdir(parents=True, exist_ok=True)
    (target / 'data').mkdir(exist_ok=True)
    if config.is_file():
        backup = target / 'backups' / datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        backup.mkdir(parents=True)
        shutil.copy2(config, backup / 'config.json')
        cfg = json.loads(config.read_text())
        paths = {f['dbPath'] for f in cfg.get('files', []) if f.get('dbPath')}
        if cfg.get('lastSelectedFilePath'):
            paths.add(cfg['lastSelectedFilePath'])
        for index, name in enumerate(sorted(paths)):
            db = Path(name)
            if not db.is_file():
                continue
            with sqlite3.connect(db.resolve().as_uri() + '?mode=ro', uri=True) as src:
                with sqlite3.connect(backup / f'{index}-{db.name}') as dest:
                    src.backup(dest)
        print('Backup:', backup)
    app = target / 'Nivo.AppImage'
    pending = target / 'Nivo.AppImage.new'
    shutil.copy2(source, pending)
    pending.chmod(0o755)
    if app.exists():
        shutil.copy2(app, target / 'Nivo.previous.AppImage')
    pending.replace(app)
    repo = Path(__file__).resolve().parent.parent
    for size in [16, 32, 48, 64, 128, 256, 512]:
        icons = data_home / f'icons/hicolor/{size}x{size}/apps'
        icons.mkdir(parents=True, exist_ok=True)
        for name in ['nivo', 'frappe-books']:
            shutil.copy2(repo / f'build/icons/{size}x{size}.png', icons / f'{name}.png')
    launcher = home / '.local/bin/nivo'
    launcher.parent.mkdir(parents=True, exist_ok=True)
    launcher.write_text('#!/bin/sh\nexport APPIMAGE_EXTRACT_AND_RUN=1\n'
                        'export CHROME_DESKTOP=frappe-books.desktop\n'
                        f'exec {shlex.quote(str(app))} "$@"\n')
    launcher.chmod(0o755)
    applications.mkdir(parents=True, exist_ok=True)
    # Keep Electron's desktop identity so taskbar and window icons match.
    desktop = applications / 'frappe-books.desktop'
    desktop.write_text('[Desktop Entry]\nName=Nivo\n'
                       'Comment=Offline accounting and business management\n'
                       f'Exec="{launcher}" %U\n'
                       f'Icon={data_home}/icons/hicolor/256x256/apps/nivo.png\n'
                       'Terminal=false\nType=Application\nCategories=Office;Finance;\n'
                       'StartupWMClass=frappe-books\n')
    desktop.chmod(0o755)
    (applications / 'nivo.desktop').unlink(missing_ok=True)
    if shutil.which('desktop-file-validate'):
        subprocess.run(['desktop-file-validate', str(desktop)], check=True)
    for cmd in [['update-desktop-database', str(applications)], ['kbuildsycoca6', '--noincremental']]:
        if shutil.which(cmd[0]):
            subprocess.run(cmd, check=True)
    print('Installed:', app)
    print('Existing database paths and settings preserved.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('appimage', type=Path)
    install(parser.parse_args().appimage.resolve())
