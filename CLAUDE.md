# CLAUDE.md

## MiniSpec (read first)

Before writing any code, read `.minispec/README.md` and follow its reading contract. As a minimum, always read `.minispec/core/project.md`, `.minispec/core/conventions.md` and `.minispec/core/principles.md`; read the rest of `.minispec/` only on demand (architecture, stack, glossary, the relevant feature or ADR). Keep features small and don't write redundant documentation.

## Commands

- `npm run build` (esbuild → `dist/server.mjs`), `npm run typecheck`, `npm run lint`.
- Tests open browsers: always in Docker, never `npm test` on the host. All: `npm run test:docker`. One file, from Git Bash: `MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs npx tsx --test test/tools/<file>.test.ts`.
- Schema check (must say no warnings): the Inspector's `tools/list --strict` inside Docker, as the `verify` skill runs it.
- More in `docs/development.md`.

## Rules that are easy to miss

- Moodle work lives in `../moodle-driver` and pseudonymization in `../pseudonym`, each worked on in its own session; this server uses both from npm (`@falkenslab/moodle-driver`, `@falkenslab/pseudonym`), bundled; a change there is a release there, then a version bump here.
- Every tool lists its driver functions in `TOOL_FUNCTIONS` (`src/tools/scopes.ts`) and is in one role list (`src/tools/roles.ts`), or a test fails; a tool that shows or acts on other people goes through `src/people.ts` (aliases, redaction, aliases refused in text sent to Moodle) and gets a test in `test/tools/pseudonymize.test.ts`.
- Driver outputs must match the tools' output schemas exactly (a field the schema lacks fails the call): check new tools against the real sandbox, not only the fake Moodle.
- The sandbox (`../moodle-sandbox`, `http://localhost:8080`): change only course 3 (`mcp-content`), never course 2. Its credentials are for logging in a scratch profile only (the `sandbox-check` skill), never in the repo, tests, docs or commits.

## Skills

Project skills in `.claude/skills/`: `verify` (the quality gate), `commit`, `add-tool` (the checklist for a tool), `update-docs`, `sandbox-check` (the real Moodle, in Docker), `upgrade-deps`, `release` and `sync-issues` (the GitHub remote exists, `falkenslab/moodle-mcp`; still only when the owner asks, and no npm release before real-client use and a full live check), and MiniSpec's `minispec-feature`, `minispec-bugfix`, `minispec-adr`, `minispec-implement`.
