# Nivo coding context

Read [AGENTS.md](../AGENTS.md) first, then the [AI entry point](../docs/ai/README.md) and the relevant topic. This is an offline Electron/Vue/TypeScript accounting app; the visible brand is Nivo while internal frappe-books identifiers are retained.

Preserve existing changes and company databases. Use model submit/cancel lifecycles, consistent SQLite backups and synthetic test companies. Never publish business data, signatures, QR images or credentials. Do not replace missing-file DB_CONNECT validation with database creation. Keep upstream AGPL attribution.

The root guide contains the tested Node 22/Yarn/Electron-native installation sequence and validation commands. Do not use legacy npm test or assume host-Node SQLite binaries work under Electron. Read architecture/change recipes before modifying accounting, IPC, feature locks or printing. Run checks appropriate to the actual change and state any checks not performed; documentation-only work needs no application release.
