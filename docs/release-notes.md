Nivo 0.40.4 completes the bounded final audit and adds portable AI/developer onboarding.

Saved payments revalidate current invoice outstanding and active/submitted state before posting. A failed lifecycle restores loaded settings after rollback, so valid later partial payments still work. Native PDF/print jobs use isolated temporary directories and clean up HTML/hidden windows on failure or cancellation; native print validates the renderer and argument bounds. Purchase-return and received-payment print labels now match cash direction.

The AI entry point is docs/ai/README.md, with canonical AGENTS.md, architecture, commands, change recipes, product decisions and official instruction-format references. Claude Code, Copilot and Gemini entry points reuse these rules; AGENTS.md-aware tools can read them directly. These documents grant no credentials and contain no company data.

The existing Bengali tutorial is retained: these corrections do not change its navigation or learning steps. Prior print/layout behavior from 0.40.3 remains.

Windows x64: choose -setup.exe or -portable.exe. Installers are unsigned; CI tests unpacked startup, while physical installation/upgrade/uninstall needs separate evidence. Linux upgrades use scripts/install-linux.py with the app closed. Back up data before upgrading. This update does not re-import, repost or invent company transactions. Legacy reconciliation, Electron runtime modernization and arbitrary concurrent database-write isolation remain separate work.

Nivo is based on Frappe Books (AGPL-3.0-only); upstream attribution is preserved.
