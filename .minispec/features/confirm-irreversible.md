# The person confirms what can't be undone

Issue: [#50](https://github.com/falkenslab/moodle-mcp/issues/50)

## Goal

Before a tool deletes or overwrites something that can't be recovered, the person says yes in their app, without the model in between.

## Context

- Every tool that changes Moodle says "confirm with the person first", but nothing in the server stops a call the model makes without asking.
- MCP elicitation asks the person a form in their app and gives the answer to the server; `add_site` already uses it (ADR-021). agent-kit gates listed tools on the client side (falkenslab/agent-kit#76), clients without elicitation can't ask at all.

## Changes

- ADR-023; `src/tools/confirm.ts`: the tools that can't be undone, each with a sentence of what will happen from its inputs, and a wrapper that asks before the tool runs; declined, nothing runs.
- `MOODLE_MCP_CONFIRM` (`--confirm`): `elicit` (default; a client without elicitation is refused) or `client` (the client asked: agent-kit's confirmTools, a one-shot run). Only the person sets it.
- Each such tool's description says the server asks; `server_info` gives the setting; the settings and limits pages explain it.

## Acceptance

- With elicitation: yes runs the tool, no leaves everything and says the person said no; without it, refused; with `client`, runs as before.
- Tests for the three cases; `--strict`; the tools reference in both languages.
