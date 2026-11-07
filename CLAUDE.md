# CLAUDE.md

## MiniSpec (read first)

Before writing any code, read `.minispec/README.md` and follow its reading contract. As a minimum, always read `.minispec/core/project.md`, `.minispec/core/conventions.md` and `.minispec/core/principles.md`; read the rest of `.minispec/` only on demand (architecture, stack, glossary, the relevant feature or ADR). Keep features small and don't write redundant documentation.

## Commands

- `npm run build` (esbuild → `dist/server.mjs`), `npm run typecheck`, `npm run lint`.
- Tests open browsers: always in Docker, never `npm test` on the host. All: `npm run test:docker`. One file, from Git Bash: `MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs npx tsx --test test/tools/<file>.test.ts`.
- Schema check (must say no warnings): the Inspector's `tools/list --strict` inside Docker (below, under `verify`).
- The documentation site is in `docs/` (Docusaurus, English and Spanish; `npm run build` there); developing notes in its `developers/` pages.

## Rules that are easy to miss

- Moodle work lives in `../moodle-driver` and pseudonymization in `../pseudonym`, each worked on in its own session; this server uses both from npm (`@falkenslab/moodle-driver`, `@falkenslab/pseudonym`), bundled; a change there is a release there, then a version bump here.
- Every tool lists its driver functions in `TOOL_FUNCTIONS` (`src/tools/scopes.ts`) and is in one role list (`src/tools/roles.ts`), or a test fails; a tool that shows or acts on other people goes through `src/people.ts` (aliases, redaction, aliases refused in text sent to Moodle) and gets a test in `test/tools/pseudonymize.test.ts`.
- Driver outputs must match the tools' output schemas exactly (a field the schema lacks fails the call): check new tools against the real sandbox, not only the fake Moodle.
- The sandbox (`../moodle-sandbox`, `http://localhost:8080`): change only course 3 (`mcp-content`), never course 2. Its credentials are for logging in a scratch profile only (the `sandbox-check` skill), never in the repo, tests, docs or commits.

## Skills

The `falkenslab-dev` plugin's skills do the generic work (`verify`, `commit`, `add-tool`, `update-docs`, `upgrade-deps`, and `release` and `sync-issues` only when the owner asks; the package is `@falkenslab/moodle-mcp` on npm, the repository `falkenslab/moodle-mcp`). Project skills in `.claude/skills/`: `sandbox-check` (the real Moodle, in Docker) and MiniSpec's `minispec-feature`, `minispec-bugfix`, `minispec-adr`, `minispec-implement`. Here the plugin's skills also follow this:

- **verify**: typecheck, lint, build, `MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs npm test` (`fail 0`), then the strict check, which must say `exit=0 warnings=0` (quote the tool count): `MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs bash -c "timeout 240 npx -y @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/list --strict >/tmp/o 2>/tmp/e; echo exit=\$? warnings=\$(grep -ci warn /tmp/e) tools=\$(grep -c '\"name\": \"' /tmp/o)"`. Afterwards no Chromium nor `node … server.mjs` left, in the container or on Windows.
- **add-tool**: a schema, a description, annotations and one driver call (ADR-014): no selectors nor `page.evaluate` here. Annotations always; `readOnlyHint: true` only when nothing changes in Moodle (ADR-020). No nullable types nor unions in schemas. Registered in `src/tools/index.ts`; an AJAX-only tool names its page in `src/tools/follow.ts`; a driver error that needs this server's words gets a line in `src/tools/errors.ts`; what can't be undone goes in `CONFIRMED` (`src/tools/confirm.ts`), in English and Spanish. Tests against the driver's fake Moodle (`@falkenslab/moodle-driver/testing`).
- **update-docs**: the site in English (`docs/content/`) and Spanish (`docs/i18n/es/docusaurus-plugin-content-docs/current/`) in the same commit, in plain words for teachers and students; commands in `<Terminal>`, example requests in `<Prompt>`. A tool: its area in `docs/scripts/tools-reference.mjs`, its Spanish in `docs/i18n/es/tools.json` (`node scripts/tools-reference.mjs --english <file>` in `docs/` gives the English and its `source` hash), then `npm run tools` in `docs/`; the tool counts on the site, `.minispec/core/project.md`, `.minispec/tool-catalog.md`. A setting: the `settings` page, `src/config.ts`'s usage text, `configure`, `server_info`. Rules for agents: `src/instructions.ts`. Screenshots are real, from `scripts/screenshots/run.mjs`.
- **upgrade-deps**: `playwright-core` moves in `../moodle-driver` first, then here at the same version, with the Docker image (`mcr.microsoft.com/playwright:v<version>-noble`) in `scripts/in-docker.mjs` and `scripts/screenshots/run.mjs`. `typescript` stays `~6.0.x` until typescript-eslint supports 7; `@types/node` stays 20. The bundle keeps `playwright-core` external and the driver inlined. A Playwright or SDK bump gets a sandbox check of a read and a write.
- **release**: no `file:` dependencies; verify and a sandbox check (login, a read, a write) on the commit. The releases page in both languages and the pinned `@X.Y.Z` examples (releases, agent-kit guide); `npm run tools`; `npx docusaurus docs:version X.Y.Z` in `docs/` copies the Spanish pages itself (copying them again nests a `current/`), then `version.label` set to `X.Y.Z` in `i18n/es/docusaurus-plugin-content-docs/version-X.Y.Z.json`, and the previous snapshot deleted (ADR-024). `npm pack --dry-run`; the owner runs `npm publish --otp=<code>`.
- **sync-issues**: every open issue gets its MiniSpec card, always, without asking (the owner's rule), linked both ways. Work for `../moodle-driver` or `../pseudonym` becomes an issue there.
- **commit**: scopes `tools`, `config`, `confirm`, `browser`, `docker`, `deps`, `docs`, `minispec`. Never `dist/`, profiles, scratch scripts or credentials.
