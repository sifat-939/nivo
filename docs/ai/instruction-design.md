# Instruction design and research

Research checked on 2026-10-29, using primary documentation:

- [AGENTS.md open format](https://agents.md/): a predictable, portable Markdown entry point for setup, tests, conventions and repository context.
- [GitHub repository custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions): Copilot supports repository-wide guidance and AGENTS.md; client/feature support differs.
- [Claude Code project memory](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools): a `CLAUDE.md` import can share AGENTS.md with clients that do not load it natively; a text import avoids Windows symlink issues.
- [Cursor rules](https://cursor.com/docs/rules): AGENTS.md is supported as a simple project-rule alternative.
- [Gemini CLI context configuration](https://geminicli.com/docs/cli/gemini-md/): context filenames are configurable. This project selects AGENTS.md instead of duplicating it.

## How Nivo applies this

Keep one canonical root instruction file with critical rules and working commands. Link to focused architecture, development, change recipes and product-state notes. Small tool-specific entry points point to that same knowledge instead of copying a long policy into every client format. This is intended to reduce repeated discovery/context use; it is not a guarantee about any model's performance or token usage.

Avoid a full file inventory, giant historical logs, stale test counts or private business examples in automatically loaded instructions. Read code and current workflows when a note is incomplete or conflicts with observed behavior. Update the relevant note with behavior changes.

Public readability is separate from write access and execution privileges. These files do not grant credentials, bypass a client's trust settings or let an unauthenticated agent push changes. For clients without automatic discovery, use the bootstrap prompt in the [AI entry point](README.md).
