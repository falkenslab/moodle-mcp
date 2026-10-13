# ADR-009: Configuration at run time with configure

## Decision

The server can start with no configuration. A `configure` tool sets the site URL, the headless mode and the profile folder for the running process, in memory only; the server writes no settings anywhere. Environment variables and arguments stay, optional, as starting values (ADR-003). Precedence: `configure`, then arguments, then variables, then defaults. Supersedes ADR-003's "configured only by environment variables or arguments" and its required `MOODLE_URL`. Amended by ADR-021: the sites added at run time are the one file the server writes.

## Motivation

A plugin's `.mcp.json` is fixed for every user, while the classroom (its URL, its mode, its profile) belongs to the client: miyagi keeps it per workspace in its own `config.json`. Passing it through environment variables needs plumbing in every host, and Claude Code's variable expansion in plugins isn't reliable. A tool lets any client hand its values over, or ask the person, with no file of the server's own to keep in sync.

## Consequences

- Tools that need the site fail with `NotConfiguredError`, which names `configure`; the `instructions` say to call it with the client's own values or to ask the person.
- `configure` checks a URL by fetching it without the browser and reading `M.cfg.wwwroot`, so any page of the site (a course URL) gives the site's base URL, and a URL that isn't a Moodle is refused before anything changes.
- Changing the profile or the mode closes the browser (saving the session, ADR-007); the next tool reopens it.
- The settings last as long as the process: a client configures each session, typically once at its start.
- `server_info` shows each setting's source.
