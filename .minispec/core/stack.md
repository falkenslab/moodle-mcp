# Stack

## Runtime

- Node.js ≥ 20, ESM, TypeScript with `NodeNext` resolution.
- `@modelcontextprotocol/sdk` — the MCP server (`McpServer`) over stdio. Bundled, so a dev dependency, like `zod` (ADR-005).
- `zod` — tool input and output schemas.
- `@falkenslab/moodle-driver` — everything Moodle, through the person's browser session (ADR-014); from the sibling folder (`file:../moodle-driver`) until it's published, bundled into the server.
- `playwright-core` — the driver's browser automation (its peer dependency), shipped beside the bundle.

## Tooling

- esbuild bundles `src/server.ts` into `dist/server.mjs` (ADR-005); `tsc` only typechecks.
- Tests: `node:test` + `node:assert/strict`, run with `tsx --test` against the source.
- ESLint with `typescript-eslint`.
- MCP Inspector (`npm run inspect`) for manual end-to-end checks.

## Distribution (ADR-005)

npm package with a `moodle-mcp` bin; `playwright-core` ships in `node_modules` (`bundleDependencies`), outside the bundle. Not published yet.
