# ADR-005: One bundled file, playwright-core outside

## Decision

esbuild bundles the server into a single `dist/server.mjs` (ESM, `--platform=node`, a `createRequire` banner for CommonJS dependencies), with the MCP SDK, zod and every other pure-JavaScript dependency inside. `playwright-core` stays outside (`--external`) and ships in `node_modules`, because it reads files of its own package at run time. The package is published to npm with `"bin": { "moodle-mcp": "dist/server.mjs" }` and `bundleDependencies: ["playwright-core"]` while it stays outside.

## Motivation

A single file starts fast and can be copied or vendored by a plugin without an `npm install` of a dependency tree. `playwright-core` locates its own `package.json`, browser registry and injected scripts relative to its install folder, which bundling may break.

## Consequences

- Bundling `playwright-core` was tried with 1.64 (8 October 2026) and it stays outside. Bundled as is, the build fails on `chromium-bidi`, an optional module it doesn't ship, and once that is external the bundle dies on import: `packageRoot = path.join(__dirname, "..")`, and an ESM bundle has no `__dirname`. It works only with a banner that defines `__dirname` over copies of its `package.json`, `browsers.json` and `lib/webp_codec.wasm` (Edge headless, Chrome headed, screenshots, locators and its browser registry all ran), which ties the build to the package's internal layout. The gain is small: an 8.7 MB bundle instead of 1.4 MB plus 14 MB in `node_modules`, the same startup (about 0.6 s), and the tarball is 3.8 MB compressed either way. And the Chromium download needs its CLI (`cli.js install`), which only exists with the package on disk.
- The package installs with `npm install --ignore-scripts` into an empty folder and works: `moodle-mcp --version`, `configure`, `list_courses` against the sandbox.
- Bundled dependencies (the MCP SDK, zod) are `devDependencies`: installing the package doesn't fetch what is already inside `dist/server.mjs`. Only what stays outside is a dependency.
- `tsc` only typechecks; esbuild does not, so `typecheck` runs before a release.
- Nothing is published to npm without the owner's explicit approval.
