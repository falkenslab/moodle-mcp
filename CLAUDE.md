# CLAUDE.md

## MiniSpec (read first)

Before writing any code, read `.minispec/README.md` and follow its reading contract. As a minimum, always read `.minispec/core/project.md`, `.minispec/core/conventions.md` and `.minispec/core/principles.md`; read the rest of `.minispec/` only on demand (architecture, stack, glossary, the relevant feature or ADR). Keep features small and don't write redundant documentation.

## Skills and commands

- Project skills in `.claude/skills/`: `verify` (the quality gate), `commit`, `add-tool` (the checklist for a tool), `update-docs`, `sandbox-check` (the real Moodle, in Docker), `upgrade-deps`, `release` and `sync-issues` (only once there's a remote and the owner asks), and MiniSpec's `minispec-feature`, `minispec-bugfix`, `minispec-adr`, `minispec-implement`.
- Tests open browsers: always `npm run test:docker` (or `MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs <command>`), never `npm test` on the host.
- Moodle work lives in `../moodle-driver` and pseudonymization in `../pseudonym`, each worked on in its own session; this server uses the driver's built `dist/` (`file:../moodle-driver`).
