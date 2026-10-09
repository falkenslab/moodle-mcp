# moodle-driver boundary

## Goal

The Moodle code behind a clean boundary in this repository, with its own public API and nothing of MCP, ready to become `@falkenslab/moodle-driver` (ADR-014).

## Context

- `src/moodle/` (about 2,100 lines) imports only Playwright, Node and, in `site.ts`, `config.ts` (`ConfigError`, `parseMoodleUrl`).
- Driver code outside it: `browser.ts` (reads `Config`: profile, channel, headless, download), `sessionCookies.ts`, `chromiumInstaller.ts`.
- Moodle logic still inside tools: `getActivityContent.ts` (reading each content type), `listCourses.ts` (the service call and `toCourse`), `login.ts` (`waitForLogin`, reading the own profile), `activityForms.ts` (`fieldsFor`: common inputs to form fields).

## Changes

- `src/driver/`: today's `src/moodle/` plus `browser.ts`, `sessionCookies.ts` and `chromiumInstaller.ts`; the Moodle logic above moved in from the tools.
- Options instead of `Config`: `createBrowserManager({ profileDir, channel, headless, downloadBrowser })` reading them through a getter, so `configure` keeps working; the site URL passed per call as today; `trail` passed where it applies.
- The driver's own errors (`MoodleUrlError` for what `site.ts` throws today); moodle-mcp maps them where it needs `ConfigError`.
- `src/driver/index.ts`: the public API; tools import only from it.
- ESLint `no-restricted-imports` in `src/driver/**`: nothing from `../tools`, `../config`, `../createServer`, `@modelcontextprotocol/*` or `zod`; in `src/tools/**`: nothing from `../driver/*` but `../driver/index.js`.
- `architecture.md` and `conventions.md` updated; no behavior change.

## Acceptance

- Every test passes in Docker unchanged in what it checks; `--strict` reports no warnings.
- Lint fails if a driver file imports anything of MCP, or a tool reaches inside the driver.
- A script outside `src/` that imports only `src/driver/index.ts` lists the sandbox teacher's courses and course 3's structure, with no MCP server.
