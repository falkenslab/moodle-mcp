# Bundled packages listed as dependencies

Issue: [#48](https://github.com/falkenslab/moodle-mcp/issues/48)

## Problem

Installing `moodle-teacher` through agent-kit 0.25 fails: "@falkenslab/moodle-mcp@0.4.0 can't run in the kit: it has dependencies it doesn't bring (gift-pegjs, parse5)". Plain `npx` also downloads both, never loading them.

## Cause

0.4.0 added `gift-pegjs` and `parse5` (for `validate_gift` and `validate_html`) to `dependencies`, while esbuild inlines them in `dist/server.mjs` like every package but `playwright-core`. agent-kit checks `package.json`: every dependency must be in `bundleDependencies`, and only `playwright-core`, the one external, is.

## Solution

- `gift-pegjs` and `parse5` in `devDependencies`, as the rest of what the bundle holds; `dependencies` keeps only `playwright-core`, in `bundleDependencies`.
- A test that fails when a package in `dependencies` is neither external in `scripts/build.mjs` nor in `bundleDependencies`.

## Verification

- The test; `npm pack --dry-run` lists no other package; the built server starts from a clean install of the packed tarball.
- 0.4.1 published, and installed through agent-kit.
