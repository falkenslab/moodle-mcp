# Architecture

## Flow

```
MCP client --stdio--> server.ts -> createServer.ts (McpServer + instructions, errors explained, following)
                                     -> tools/<tool>.ts (schema, description, one call) -> @falkenslab/moodle-driver -> Moodle
                         ^
                     config.ts (arguments + environment variables, then the configure tool)
```

Everything that works Moodle is moodle-driver's (sibling repository, ADR-014): the browser and its profile, logging in, AJAX through the page, forms, and every Moodle area. This server adds what MCP needs.

## Key pieces (`src/`)

- `server.ts` — the entry point (the bundle's): reads the configuration, creates the driver's browser manager with it, connects stdio, closes the browser when the client leaves (stdin closed or a signal).
- `createServer.ts` — the `McpServer` with its `instructions` and tools, apart from the entry point so tests drive it through an in-memory transport. It wraps every tool with `explainErrors` and `followTools`.
- `config.ts` — `loadConfig(argv, env)`: the starting `Config`, all optional (arguments win over environment variables; an invalid value stops the server with a message on stderr). One `Config` object is shared by the tools and the driver's browser manager (it is the driver's `BrowserOptions`), and `configure` changes it in place (ADR-009); `requireSiteUrl()` throws `NotConfiguredError`. Channels, trails and the URL's parsing are the driver's.
- `instructions.ts` — the server's usage rules for any client.
- `tools/index.ts` — the list of tools; `tools/<tool>.ts` — one tool each (or a small family: `courseLayout.ts`, `quizAttempts.ts`, `assignSubmission.ts`, `courseOverview.ts`, `browserTools.ts`): its schemas, annotations, description, and a handler that calls the driver.
- `tools/reply.ts` — `reply()`: structured content plus the same JSON as text; `onSite()`: the site checked before the browser opens, so a server without one says to configure it.
- `tools/errors.ts` — the driver's errors in this server's terms: `NotLoggedInError` and login timeouts name `login`, browser and display errors name `MOODLE_MCP_*` settings.
- `tools/follow.ts` — the Moodle page each AJAX tool shows while the person watches (ADR-011; the mechanism is the driver's).
- `tools/configure.ts` — `configure`: URL (checked with the driver's `findMoodleSite`), headless, trail, profile folder, in memory (ADR-009); closes the browser when the profile or the mode changes.
- `tools/login.ts`, `tools/logout.ts` — the driver's `logIn` with progress notifications while the person logs in; `logOut`.
- `tools/showBrowser.ts` — `show_browser` (ADR-011).
- `tools/browserTools.ts` — the browser fallback tools (ADR-010) on the driver's working tab: a route keeps the tab's page on the site, password fields are refused, snapshots (`ariaSnapshot` in `ai` mode, refs resolved with `getByRef`) cover `#region-main` and are cut at 30,000 characters; actions wait for `M.util.pending_js`.
- `tools/serverInfo.ts` — `server_info`: the effective configuration, never secrets.
- `version.ts` — the package name and version, from `package.json` (inlined by esbuild).

## Folder map

- `src/` — the server; `test/` — `node:test` suites mirroring it, against the driver's fake Moodle (`@falkenslab/moodle-driver/testing`).
- `scripts/` — the esbuild build (the driver bundled, `playwright-core` outside) and the Docker runner for anything that opens a browser.
- `dist/server.mjs` — the bundle and the package's bin (not committed).
- `docs/tool-catalog.md` — candidate tools by use case; `.minispec/` — this specification.
