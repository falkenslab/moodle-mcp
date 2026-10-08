# ADR-005: One bundled file, playwright-core outside

## Decision

esbuild bundles the server into a single `dist/server.mjs` (ESM, `--platform=node`, a `createRequire` banner for CommonJS dependencies), with the MCP SDK, zod and every other pure-JavaScript dependency inside. `playwright-core` stays outside (`--external`) and ships in `node_modules`, because it reads files of its own package at run time. The package is published to npm with `"bin": { "moodle-mcp": "dist/server.mjs" }` and `bundleDependencies: ["playwright-core"]` while it stays outside.

## Motivation

A single file starts fast and can be copied or vendored by a plugin without an `npm install` of a dependency tree. `playwright-core` locates its own `package.json`, browser registry and injected scripts relative to its install folder, which bundling may break.

## Consequences

- Whether bundling `playwright-core` really breaks is checked with the current version (`features/bundle-playwright-core.md`); if it works, it goes inside and `bundleDependencies` is dropped.
- `tsc` only typechecks; esbuild does not, so `typecheck` runs before a release.
- Nothing is published to npm without the owner's explicit approval.
