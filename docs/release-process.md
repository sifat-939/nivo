# Nivo releases

## Build and validation

1. Update the application version in `package.json` and add a dated changelog.
2. Run `yarn typecheck` and `bash scripts/test-nivo.sh`.
3. Build with `yarn build --linux AppImage --x64 --nosign --publish never` or `yarn build:windows` on Windows.
4. Exercise the packaged application with a temporary company/profile: opening an existing database, invoice/payment posting and cancellation, feature visibility, printing/export, backup and restore.
5. Record the artifact SHA-256, test results and known limitations. CI keeps the Linux artifact for review; a successful build alone is not approval to publish it.

## Install and rollback

Close Nivo, then run `python3 scripts/install-linux.py /absolute/path/to/Nivo.AppImage`. The installer snapshots configured company databases with SQLite's backup API, preserves the existing profile and keeps the previous binary at `~/.local/share/nivo/Nivo.previous.AppImage`. Do not replace or move databases manually.

If the release fails, close Nivo and reinstall the previous binary through the same installer. Binary rollback does not undo database migrations. If a data restore is required, first preserve a fresh snapshot and validate the selected backup using a validated SQLite snapshot. Keep all snapshots until accounting totals and party balances have been verified.

## Update feed

Automatic upstream updates stay disabled. Enable automatic updates only after Nivo has its own release feed, signing/verification and tested migration/rollback path. Never point Nivo at upstream Frappe Books artifacts: branding and local data compatibility must be retained.

## Runtime upgrade compatibility stage

Upgrade Electron, its native SQLite module and the build/test dependencies together in a separate change. Rebuild native modules for the selected Electron ABI; validate Linux packaging, Wayland/X11 startup, IPC/dialogs, print/PDF, SQLite backup/restore, setup and posting against temporary copies. Keep the previous release runnable. Dependency version changes are not considered complete until these checks pass; do not infer compatibility from installation success or typechecking alone.

## GitHub workflow

The source repository root must contain `package.json`, `yarn.lock`, `.github/`, and all source folders. Run `python3 scripts/check-repository.py --zip release-source.zip` to produce a source-only archive without local databases, private migration evidence, dependencies, installers or Git history. The check scans tracked and non-ignored untracked candidates; review new assets/documents before publishing. Local one-off migration scripts are excluded intentionally, while their reusable safety tests remain public.

`Build Nivo` runs on pull requests or manually and produces separate Windows x64 setup/portable installers and a Linux AppImage. It runs typechecking, Linux regressions/packaged tests and a Windows unpacked-startup smoke. The startup smoke does not replace a real Windows install/upgrade/uninstall test. Download workflow artifacts for review.

A pushed `v<package.json version>` tag runs `Release Nivo`. Only successful builds publish assets and SHA256SUMS.txt to the calling repository using the built-in GitHub token. Update `docs/release-notes.md` before tagging. No upstream release credentials or telemetry secrets are required or packaged. Setup and portable artifacts have distinct names. No Windows code-signing certificate is configured; these binaries are unsigned. A signed release needs a certificate issued to the actual distributor and separate configuration.

Before the first public Windows release, test installation, existing company reopen, a copied-company invoice/payment/cancellation, printing, backups, upgrade and uninstall while preserving user data on Windows 10/11 x64. Linux checks alone cannot certify Windows behaviour. Automatic updates stay disabled.

The release workflow also includes `output/pdf/Nivo-Bangla-Guide.pdf` in the release assets and checksum manifest. Keep the published tutorial consistent with the tagged app version; its editable text, synthetic screenshots and regeneration instructions are under `docs/user-guide/`.
