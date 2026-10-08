# Stack

## Runtime

- Node.js ≥ 20, ESM, TypeScript with `NodeNext` resolution.
- `@modelcontextprotocol/sdk` — the MCP server (`McpServer`) over stdio. Bundled, so a dev dependency, like `zod` (ADR-005).
- `zod` — tool input and output schemas.
- `playwright-core` — browser automation with the system's Edge or Chrome, no bundled browsers (ADR-001).

## Tooling

- esbuild bundles `src/server.ts` into `dist/server.mjs` (ADR-005); `tsc` only typechecks.
- Tests: `node:test` + `node:assert/strict`, run with `tsx --test` against the source.
- ESLint with `typescript-eslint`.
- MCP Inspector (`npm run inspect`) for manual end-to-end checks.

## Distribution (ADR-005)

npm package with a `moodle-mcp` bin; `playwright-core` ships in `node_modules` (`bundleDependencies`) while it stays outside the bundle. Not published yet.
