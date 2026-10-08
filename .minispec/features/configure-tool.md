# configure tool

## Goal

A client configures the server at run time with a `configure` tool (site URL, headless, profile folder), kept in memory only; environment variables and arguments stay as optional starting values.

## Context

- Today `MOODLE_URL` is required at startup (ADR-003): without it the server exits, so an agent can't supply it.
- In a plugin, `.mcp.json` is fixed; miyagi keeps the classroom's URL, course and headless mode in each workspace's `config.json` and would rather hand them to the server than set environment variables.
- The server must stay generic and store nothing of its own.

## Changes

- `config.ts`: the URL becomes optional; each setting records its source (`argument`, `environment`, `configure`, `default`).
- The server starts unconfigured; tools that need the site fail with an error naming `configure`.
- `tools/configure.ts`: `url`, `headless`, `profileDir`, each optional, validated as today. A URL is checked to be a Moodle by fetching it without the browser and reading `M.cfg.wwwroot`, which also turns a course URL into the site's. Changing the profile or the mode closes the browser first; it reopens on the next call. Returns what `server_info` returns.
- `moodle/ajax.ts`: the kept service tab belongs to one site URL.
- `server_info`: the URL may be missing; shows each setting's source.
- `instructions.ts`: when a tool says the server isn't configured, call `configure` with the values from the client's own configuration or from the person.
- A new ADR, partly superseding ADR-003; README's configuration section.

## Acceptance

- `node dist/server.mjs` with no variables starts; `list_courses` answers that it isn't configured and names `configure`.
- `configure` with the sandbox's course URL sets `http://localhost:8080/`; then `login` and `list_courses` work.
- A URL that isn't a Moodle, or can't be reached, is refused with a clear message, and the previous configuration stays.
- Changing `headless` or `profileDir` while the browser is open closes it; the next tool opens it with the new values.
- Environment variables and arguments work as before; nothing is written to disk by `configure`.
