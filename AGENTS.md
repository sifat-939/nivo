# Nivo project

- This repository is the active Nivo desktop app, based on Frappe Books Electron/Vue. Do not work on archived Odoo or Karbar projects.
- Preserve accounting rules, company data, and the SQLite schema unless a requested feature explicitly requires changes.
- Keep company databases outside the repository and build/install folders. Linux production data lives under `$XDG_DATA_HOME/nivo/data` or `~/.local/share/nivo/data`.
- Opening an existing company must never create a missing database. Keep the `DB_CONNECT` validation separate from explicit `DB_CREATE`.
- Install Linux builds with `scripts/install-linux.py`; close the app first. Keep settings, SQLite backups, and desktop identity across updates.
- The internal `frappe-books` package/profile/desktop identity is retained for compatibility. User-visible branding is Nivo.
- Before moving any company database, make a consistent SQLite backup, update its configured path, and verify reopening it. Never treat a database as obsolete merely because it is alongside old source or installers.
- Preserve the upstream license and attribution. Do not commit business databases, private settings, or packaged builds.
