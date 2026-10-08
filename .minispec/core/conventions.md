# Conventions

- Everything in English: code, comments, `README.md`, `CLAUDE.md`, `.minispec/`, tool names and descriptions, the server's `instructions`, commit messages (ADR-006).
- Commits follow Conventional Commits, one logical change each.
- Relative imports inside `src/` use explicit `.js` extensions (NodeNext).
- One tool per file in `src/tools/`, registered from `src/tools/index.ts`. Tool names are snake_case Moodle verbs and nouns (`list_courses`), never browser actions (ADR-004).
- Every tool declares its annotations: `readOnlyHint: true` when it only reads; `destructiveHint` and `idempotentHint` when it writes.
- Tools return `structuredContent` matching an `outputSchema`, plus the same data as JSON text for clients that ignore it. Schemas avoid nullable types (an optional field instead), which some clients reject; the Inspector's `--cli` with `--method tools/list --strict` checks them (see the README).
- stdout belongs to the MCP protocol: logs and diagnostics go to stderr only.
- No credentials anywhere in the repo: code, tests, fixtures, docs. Tool results never include passwords, cookies or session tokens.
- Configuration is read only in `src/config.ts`; the rest of the code receives a `Config`.
- Every tool that reads a site page opens it with `openSitePage()` (`src/moodle/session.ts`), so a missing session always gives the same error naming `login`.
- Tests mirror `src/` under `test/`; a bug fixed gets a regression test.
- Doc comments explain *why*, and mark Moodle or Playwright behavior verified by hand as "confirmed empirically" (with the Moodle version).
- Documentation Markdown: one line per paragraph and list item, no horizontal rules between sections.
