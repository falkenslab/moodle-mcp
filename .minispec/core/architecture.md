# Architecture

## Flow

```
MCP client --stdio--> server.ts -> createServer.ts (McpServer + instructions) -> tools/<tool>.ts -> browser.ts (persistent context, system channel) -> Moodle pages
                         ^
                     config.ts (arguments + environment variables, then the configure tool)
```

## Key pieces (`src/`)

- `server.ts` — the entry point (the bundle's): reads the configuration, connects stdio, closes the browser when the client leaves (stdin closed or a signal).
- `createServer.ts` — the `McpServer` with its `instructions` and tools, apart from the entry point so tests drive it through an in-memory transport.
- `config.ts` — `loadConfig(argv, env)`: the starting `Config`, all optional (arguments win over environment variables; an invalid value stops the server with a message on stderr). One `Config` object is shared by the tools and the browser, and `configure` changes it in place (ADR-009); `requireSiteUrl()` throws `NotConfiguredError`.
- `browser.ts` — `createBrowserManager()`: opens the persistent Playwright context on the configured profile on first use (Edge, then Chrome, unless a channel is set) and reuses it, one operation at a time; a headed request (login) relaunches it with a window; a closed window means a new launch on the next call. With no system browser, it starts the Chromium download in the background and answers `BrowserDownloadingError` until it ends (ADR-001).
- `chromiumInstaller.ts` — `installChromium()`: `playwright-core`'s CLI from `node_modules`, its output on stderr.
- `sessionCookies.ts` — the session cookies Chromium drops on close, saved in the profile and restored on launch (ADR-007).
- `moodle/session.ts` — whether a page has a real user logged in (`notloggedin` body class, `M.cfg.userId`, login and logout links to tell a guest; never visible texts), `openSitePage()` for tools (throws `NotLoggedInError`, which names `login`).
- `moodle/ajax.ts` — `callService()`: one of Moodle's AJAX services, called from a kept logged-in tab with its `sesskey` (ADR-008); a stale tab is replaced, a session error becomes `NotLoggedInError`.
- `instructions.ts` — the server's usage rules for any client.
- `moodle/site.ts` — `findMoodleSite()`: a site's base URL from any of its pages, fetched without the browser (`M.cfg.wwwroot`).
- `tools/configure.ts` — `configure`: URL, headless, profile folder, in memory (ADR-009); closes the browser when the profile or the mode changes.
- `tools/login.ts` — `login`: returns the user if the session is alive; else a window at the login page, waiting (with progress notifications) until the person is back on the site logged in.
- `tools/listCourses.ts` — `list_courses`: the person's courses, from `core_course_get_enrolled_courses_by_timeline_classification`.
- `tools/listAssignments.ts` — `list_assignments`: a course's assignments by course module id, from `core_courseformat_get_state`.
- `moodle/assign.ts` — an assignment's instance and context ids from its grader page (cached in memory; no service gives them), participants and their dates through `mod_assign_list_participants` and `mod_assign_get_participant`, and a submission's content from the grader panel fragment (`core_get_fragment`), read by class in a blank tab.
- `tools/getSubmissions.ts` — `get_submissions`: every participant's status, dates and, by default, content.
- `moodle/text.ts` — `decodeEntities()`: names Moodle formatted for HTML, as plain text.
- `tools/index.ts` — the list of tools; `tools/<tool>.ts` — one tool each: its schemas, annotations and handler, receiving a `ToolContext` (`config`, `browser`).
- `version.ts` — the package name and version, from `package.json` (inlined by esbuild).

## Folder map

- `src/` — the server.
- `test/` — `node:test` suites mirroring `src/`.
- `scripts/` — build helpers (esbuild).
- `dist/server.mjs` — the bundle and the package's bin (not committed).
- `.minispec/` — this specification; `.claude/skills/` — skills for developing this repo.
