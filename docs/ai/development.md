# Development and verification

Run from the directory containing `package.json`. Follow root [setup commands](../../AGENTS.md#commands-from-the-directory-containing-packagejson). The tested sequence skips package install scripts, explicitly installs Electron/esbuild, then runs `yarn postinstall` to rebuild SQLite for Electron. A plain Node 22 SQLite build can fail even though the application works under Electron. Do not replace Yarn Classic or regenerate the lockfile incidentally.

## Daily commands

```bash
yarn dev
yarn typecheck
bash scripts/test-nivo.sh
python3 scripts/check-repository.py
```

`yarn test:nivo` is an alias for the maintained shell runner. It runs a Node asset-path check, then Tape using Electron-as-Node, ts-node and an in-memory database. An ordinary Node process cannot load an Electron-ABI SQLite binary. On a headless Linux machine use:

```bash
xvfb-run -a bash scripts/test-nivo.sh
```

Lint touched application modules with the local ESLint executable, following existing configuration; run Prettier on edited supported source files. Documentation-only changes need path/link/source checks rather than a fresh desktop rebuild.

## Package and exercise the app

```bash
# Linux
node build/scripts/build.mjs --linux AppImage --x64 --nosign --publish never
# Windows, on Windows
node build/scripts/build.mjs --win nsis portable --x64 --nosign --publish never
```

Build output is under `dist_electron/` (ignored). The build removes its previous output: finish building before running packaged tests. Do not rebuild concurrently with a test using that payload.

```bash
# Linux packaged checks, after building
node uitest/nivo-audit-regression.cjs
node uitest/nivo-accounts-hr.cjs
node uitest/nivo-standard-print.cjs
```

Prefix GUI commands with `xvfb-run -a` on headless Linux. These harnesses use Playwright Electron with disposable companies and separate profiles. On Windows, the build workflow also runs `node uitest/windows-smoke.cjs`. That checks unpacked startup, not physical install/upgrade/uninstall. Do not claim the latter passed without actual evidence.

## Choose checks proportional to the change

| Change | Relevant evidence |
| --- | --- |
| Documentation/instruction files | Resolve local links, validate config JSON, inspect diff, public source check |
| UI / routes / features | Typecheck, touched-file lint, relevant model/policy regressions, packaged UI and both themes |
| Accounting / payment / payroll / stock | Above plus submit, cancel, allocation and injected-failure rollback cases in temporary databases |
| Database / IPC / backup | Existing-file validation, missing-file refusal, safe snapshots/restore and legacy-schema fixture tests |
| Print/PDF | Standard-print tests, actual PDF export, render pages, inspect pagination/images/columns/QR rules |

For a focused unit run, copy the environment/loader options from [scripts/test-nivo.sh](../../scripts/test-nivo.sh) and select the relevant Tape spec. Some renderer/report modules import Vue components and cannot be required in a plain Node test: test their pure helper or use the packaged harness.

## Publishing and limitations

Inspect `.github/workflows/` and the actual target remote. [Release process](../release-process.md) describes version-matching tags and artifacts; do not overwrite published tags. Close the local app and use the Linux installer when installation is part of the task. Source export is `python3 scripts/check-repository.py --zip release-source.zip` (ignored output).

A source-only clone contains no company database, real signature or bank QR. Start a synthetic company; do not manufacture a production-data path. Describe unavailable display/platform/compiler checks honestly instead of marking them passed.
