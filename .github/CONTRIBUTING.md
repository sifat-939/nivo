# Contributing to Nivo

Read AGENTS.md before changing code. Preserve the AGPL license and upstream attribution. Keep accounting changes small and test document submission, cancellation and recovery from failures against temporary databases. Never include real company data, private migration evidence or credentials in an issue, test fixture or screenshot.

Use Node.js 22 and Yarn Classic 1.22.22. Run `yarn typecheck`, `yarn test:nivo` and `python3 scripts/check-repository.py` before submitting. Follow the surrounding Vue/TypeScript style and lint touched modules. Packaged UI checks are under `uitest/`; Windows packaging should run on Windows. See docs/release-process.md for release validation.

The original upstream contribution guide is preserved at docs/upstream-contributing.md as historical project context. Open Nivo issues and pull requests in the current Nivo repository, not the upstream repository.

For an AI contributor or a fresh developer session, start with [the AI entry point](../docs/ai/README.md); it links architecture, verified development commands and task-specific change recipes. Keep those notes synchronized when behavior changes.
