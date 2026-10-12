# Conventions

- Everything in English: code, comments, `README.md`, `CLAUDE.md`, `.minispec/`, tool names and descriptions, the server's `instructions`, commit messages (ADR-006).
- Commits follow Conventional Commits, one logical change each.
- Relative imports inside `src/` use explicit `.js` extensions (NodeNext).
- One tool per file in `src/tools/`, registered from `src/tools/index.ts`; a small family of tools sharing schemas and result may share a file (`courseLayout.ts`). Tool names are snake_case Moodle verbs and nouns (`list_courses`), never browser actions (ADR-004).
- Every tool declares its annotations: `readOnlyHint: true` when it only reads; `destructiveHint` and `idempotentHint` when it writes.
- Tools return `structuredContent` matching an `outputSchema`, plus the same data as JSON text for clients that ignore it; an image (`browser_screenshot`) is image content only. Schemas avoid nullable types (an optional field instead), which some clients reject; the Inspector's `--cli` with `--method tools/list --strict` checks them (see the site's `developers/` page).
- A tool that can return a long list (notifications, logs) takes `limit` (a default that fits a client's context) and `offset`, and returns `more`, from the driver's `ListPage`; its description says so.
- stdout belongs to the MCP protocol: logs and diagnostics go to stderr only.
- No credentials anywhere in the repo: code, tests, fixtures, docs. Tool results never include passwords, cookies or session tokens.
- Configuration is read only in `src/config.ts` and changed only by `configure`; the rest of the code reads the shared `Config` when it needs a value, never copying it at startup, and gets the site with `requireSiteUrl()`.
- Moodle work belongs in moodle-driver (ADR-014): a tool is a schema, a description, annotations and one driver call (`reply(await driverFunction(...(await onSite(config, browser)), …))`). Logic a tool would need about Moodle goes to the driver first, in its own session or change. The driver's errors name no tool: `src/tools/errors.ts` explains them.
- Tests mirror `src/` under `test/`, against the driver's fake Moodle (`@falkenslab/moodle-driver/testing`); a bug fixed gets a regression test. Test files run one at a time (`--test-concurrency=1`): each launches a real browser. Anything that launches a browser (the tests, checks against the sandbox) runs in Docker (`npm run test:docker`, `scripts/in-docker.mjs`), never on the developer's desktop (asked by the owner, 9 October 2026).
- Doc comments explain *why*, and mark Moodle or Playwright behavior verified by hand as "confirmed empirically" (with the Moodle version).
- Documentation Markdown: one line per paragraph and list item, no horizontal rules between sections.
