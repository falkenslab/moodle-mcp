# Architecture

## Flow

```
MCP client --stdio--> server.ts -> createServer.ts (McpServer + instructions) -> tools/<tool>.ts -> browser.ts (persistent context, system channel) -> Moodle pages
                         ^
                     config.ts (environment variables + arguments)
```

## Key pieces (`src/`)

- `server.ts` — the entry point (the bundle's): reads the configuration, connects stdio, closes the browser when the client leaves (stdin closed or a signal).
- `createServer.ts` — the `McpServer` with its `instructions` and tools, apart from the entry point so tests drive it through an in-memory transport.
- `config.ts` — `loadConfig(argv, env)`: arguments win over environment variables; validated at startup, which fails with a message on stderr (ADR-003).
- `browser.ts` — `createBrowserManager()`: opens the persistent Playwright context on the configured profile on first use (Edge, then Chrome, unless a channel is set) and reuses it; a closed window means a new launch on the next call.
- `instructions.ts` — the server's usage rules for any client.
- `tools/index.ts` — the list of tools; `tools/<tool>.ts` — one tool each: its schemas, annotations and handler, receiving a `ToolContext` (`config`, `browser`).
- `version.ts` — the package name and version, from `package.json` (inlined by esbuild).

## Folder map

- `src/` — the server.
- `test/` — `node:test` suites mirroring `src/`.
- `scripts/` — build helpers (esbuild).
- `dist/server.mjs` — the bundle and the package's bin (not committed).
- `.minispec/` — this specification; `.claude/skills/` — skills for developing this repo.
