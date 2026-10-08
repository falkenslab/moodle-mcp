# ADR-003: Generic configuration and instructions

> Partly superseded by ADR-009: `configure` sets the configuration at run time, and nothing is required at startup.

## Decision

The server is configured only by environment variables or command-line arguments (arguments win): the site's URL (`MOODLE_URL`, `--url`), the profile folder (`MOODLE_MCP_PROFILE_DIR`, `--profile-dir`), the browser channel and headless mode. Its usage rules go in the MCP server's `instructions` field, which every client reads.

## Motivation

The first consumer is miyagi, through a Claude Code plugin, but the server must work the same from Claude Code, Claude Desktop or any agent. Variables and arguments are what every MCP client can pass; `instructions` is the protocol's place for how to use a server, so no client-specific prompt or skill is needed for the basics.

## Consequences

- Nothing in the code or the `instructions` names agent-kit, miyagi or a particular client; client-specific workflows belong in the client (miyagi's plugin skills).
- A missing or invalid setting stops the server at startup with a message on stderr.
- `server_info` shows the effective configuration, never a secret (a URL's user and password are stripped).
