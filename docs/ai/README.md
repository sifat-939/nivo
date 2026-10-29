# AI entry point

Read the root [AGENTS.md](../../AGENTS.md) first. This directory is a map for a new coding assistant, not a replacement for inspecting source. The repository is publicly readable at [sifat-939/nivo](https://github.com/sifat-939/nivo); writing changes still requires an authorized account.

## Read only what you need

| Question | Read next |
| --- | --- |
| How does data move through the app? Which files own it? | [Architecture](architecture.md) |
| How do I install, run, test or build? | [Development](development.md) |
| Which layer should I edit for this task? | [Change recipes](change-recipes.md) |
| What product choices and limitations must I retain? | [Project state](project-state.md) |
| Why these AI instruction files? What standards were researched? | [Instruction design](instruction-design.md) |

The current `package.json`, source and workflows are authoritative. Dated audit/import documents under `docs/` describe specific historical snapshots; read them only for a relevant issue. Do not treat an old report's app version or uncompleted task as the current state.

## Tool entry points

- **AGENTS.md-aware agents (including Cursor):** use the root file directly.
- **Claude Code:** `CLAUDE.md` imports the same root file, including for clients without native AGENTS.md loading.
- **GitHub Copilot:** `.github/copilot-instructions.md` supplies the essential boundaries and points here.
- **Gemini CLI:** `.gemini/settings.json` selects AGENTS.md as its context file.
- **Other assistants:** provide the short prompt below. Automatic instruction discovery varies by client/version; these files cannot guarantee that every tool will load or obey them.

```text
Work in the Nivo repository. Read AGENTS.md and docs/ai/README.md first,
then the relevant linked note and source files. Preserve existing changes
and company data. Implement: [describe the task]. Verify the relevant
behavior and report changed files, checks run and unresolved limitations.
```

## Handoff after interrupted work

Before continuing, inspect the current diff and existing outputs; do not restart blindly. A useful handoff records the requested behavior, files changed, checks with actual outcomes, remaining work and any temporary fixture/artifact locations. Keep private business data out of committed handoffs. A successful build alone does not prove a feature, import or upgrade is complete.
