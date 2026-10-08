# Architecture

## Flow

```
MCP client --stdio--> server.ts (McpServer + instructions) -> tools/<tool>.ts -> browser.ts (persistent context, system channel) -> Moodle pages
                         ^
                     config.ts (environment variables + arguments)
```

## Key pieces (`src/`)

- `server.ts` — the entry point (the bundle's): reads the configuration, creates the `McpServer` with its `instructions`, registers the tools, connects stdio, closes the browser on exit.
- `config.ts` — `loadConfig(argv, env)`: arguments win over environment variables; validated with zod; fails at startup with a message on stderr (ADR-003).
- `browser.ts` — opens the persistent Playwright context on the configured profile and channel on first use and reuses it; headed or headless; closes it on shutdown.
- `instructions.ts` — the server's usage rules for any client.
- `tools/index.ts` — the list of tools; `tools/<tool>.ts` — one tool each: its schemas, annotations and handler, receiving a `ToolContext` (`config`, `browser`).
- `version.ts` — the package name and version, injected by esbuild.

## Folder map

- `src/` — the server.
- `test/` — `node:test` suites mirroring `src/`.
- `scripts/` — build helpers (esbuild).
- `dist/server.mjs` — the bundle and the package's bin (not committed).
- `.minispec/` — this specification; `.claude/skills/` — skills for developing this repo.
