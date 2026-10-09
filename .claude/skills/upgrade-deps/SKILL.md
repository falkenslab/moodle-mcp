---
name: upgrade-deps
description: Upgrade moodle-mcp's key dependencies - the MCP TypeScript SDK, playwright-core (with the Docker image that must match it), zod, esbuild, TypeScript and the lint stack - and re-validate the behaviors the server relies on. Use when the user asks to bump a dependency, or when investigating a behavior change after an update.
---

# Upgrading moodle-mcp's dependencies

The server relies on behaviors confirmed by hand ("confirmed empirically" in comments and ADRs). An upgrade is more than `npm update`.

## 1. Upgrade

```
npm outdated
npm install <package>@<version>
```

Read the release notes when reachable. One package (or one family: `typescript-eslint` with `eslint`) per commit.

## 2. Package by package

- **`playwright-core`**: it's the driver's peer dependency too. Upgrade it in `../moodle-driver` first (its session), then here, to the same version. **Change the Docker image in `scripts/in-docker.mjs` to the same version** (`mcr.microsoft.com/playwright:v<version>-noble`): the image's Chromium build is what Playwright expects (`chromium-<build>` under `/ms-playwright`). Then re-check: `launchPersistentContext` with `msedge`/`chrome`/`chromium`; the missing-channel message still matches `NOT_INSTALLED` in the driver's `browser.ts`; `ariaSnapshot({ mode: "ai" })` and `getByRef()` (the browser fallback tools); `context.route` with `abort("aborted")` keeping the page where it was; `context.request.get` carrying the profile's cookies (`download_file`).
- **`@modelcontextprotocol/sdk`**: `registerTool` with `outputSchema` and `structuredContent`; annotations; progress notifications through `extra._meta.progressToken` and `extra.sendNotification`; the in-memory transport the tests use; tool errors coming back as `isError` with the thrown message (what `src/tools/errors.ts` relies on); `followTools`/`explainErrors` wrapping `registerTool` still works (they replace it on the instance). Run the Inspector's `--strict` check (in `verify`).
- **`zod`**: tool schemas, `z.record`, `.datetime({ offset: true })`, and the JSON Schema the SDK makes of them (`--strict` again).
- **`typescript`**: stays on the 6.x line until `typescript-eslint` supports 7 (`~6.0.x` in `package.json`).
- **`esbuild`**: the bundle keeps `playwright-core` external, the `createRequire` banner, and the driver inlined (`grep -c createBrowserManager dist/server.mjs`).

## 3. Run the gate

Run the `verify` skill. Type errors are usually the first sign of a changed contract. For `playwright-core` and the SDK, also a `sandbox-check` of a read and a write tool.

## 4. Record it

Commit with the `commit` skill: `build(deps): …` for a plain bump, `fix`/`refactor` for code that had to adapt, with what was re-confirmed and on which version (update the "confirmed empirically" notes you re-checked).
