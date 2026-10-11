# Stack

## Runtime

- Node.js ≥ 20, ESM, TypeScript with `NodeNext` resolution.
- `@modelcontextprotocol/sdk` — the MCP server (`McpServer`) over stdio. Bundled, so a dev dependency, like `zod` (ADR-005).
- `zod` — tool input and output schemas.
- `@falkenslab/moodle-driver` — everything Moodle, through the person's browser session (ADR-014); from npm (`^0.3`), bundled into the server, so a dev dependency like the SDK; its primitives come from `@falkenslab/moodle-driver/internals`, its fake Moodle from `/testing`.
- `@falkenslab/pseudonym` — other people as aliases and redaction of free text (ADR-013, ADR-016), through `src/people.ts`; from npm (`^0.2`), bundled like the driver. Its key and directory live in the person's home (`PSEUDONYM_HOME` in tests).
- `playwright-core` — the driver's browser automation (its peer dependency), shipped beside the bundle.

## Tooling

- esbuild bundles `src/server.ts` into `dist/server.mjs` (ADR-005); `tsc` only typechecks.
- Tests: `node:test` + `node:assert/strict`, run with `tsx --test` against the source.
- ESLint with `typescript-eslint`.
- MCP Inspector (`npm run inspect`) for manual end-to-end checks.

## Distribution (ADR-005)

npm package with a `moodle-mcp` bin; `playwright-core` ships in `node_modules` (`bundleDependencies`), outside the bundle. Not published yet: after use in a real client and a full live check. Source at `github.com/falkenslab/moodle-mcp` (public).
