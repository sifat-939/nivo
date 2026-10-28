# Security and private data

Do not attach company databases, exported statements, backup archives, credentials or private configuration to public issues. Reproduce problems with synthetic data or redacted diagnostics. For a vulnerability, use the current repository's private vulnerability reporting feature if enabled; otherwise contact its maintainer through a private channel before publishing details.

Nivo is based on the legacy Electron/Vue Frappe Books application. The current runtime is Electron 22; it is not a current security-supported Electron release. A coordinated Electron/native-SQLite upgrade remains a separate compatibility task (see docs/release-process.md). Avoid loading untrusted templates or application content. Release signatures are not configured; verify release provenance and checksums. Automatic upstream updates are disabled.

Company databases must remain outside source/build directories. The public-source checker catches known file and credential patterns; it cannot prove that arbitrary prose or images contain no private information.
