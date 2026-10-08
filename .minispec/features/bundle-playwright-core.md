# Bundling playwright-core

## Goal

Find out whether `playwright-core` 1.64 works bundled into `dist/server.mjs`, and keep it inside or outside accordingly (ADR-005).

## Context

- Today it's `--external`, a regular dependency and in `bundleDependencies`; the rest is bundled (1.3 MB, mostly zod).
- The package is 14 MB and already self-bundled (`lib/coreBundle.js`, `lib/utilsBundle.js`), but it reads files of its own at run time: `package.json`, `browsers.json` (browser revisions), `lib/vite/` (trace viewer and recorder), `webp_codec.wasm`, `xdg-open`, and resolves paths from `__dirname`.
- The server uses little of it: `chromium.launchPersistentContext` with a channel, pages and locators, and later its installer (`features/chromium-download.md`).

## Changes

- Build a variant without `--external` and run the server's real paths from the bundle: launch Edge and Chrome headless and headed on a profile, open a sandbox page, take a screenshot, look up a channel's executable, and the Chromium install path.
- Compare bundle size and startup time with the external build.
- Check `npm pack` both ways: the tarball's size and contents, and an install into an empty folder with `--ignore-scripts`.
- If everything works: drop `--external`, move `playwright-core` to `devDependencies`, drop `bundleDependencies`, and record it in a new ADR superseding that part of ADR-005. If not: write down what breaks in ADR-005's consequences.

## Acceptance

- The decision is recorded, with the evidence (what was run, what broke or didn't).
- From a packed tarball installed with `--ignore-scripts` in an empty folder, `moodle-mcp --version`, `server_info` and a browser launch against the sandbox work.
