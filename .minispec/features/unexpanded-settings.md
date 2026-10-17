# Unexpanded placeholders count as not set

Issue: [#25](https://github.com/falkenslab/moodle-mcp/issues/25)

## Goal

A setting a client passes as an unexpanded `${…}` placeholder counts as not set, so the extensions that start moodle-mcp work the same in Claude Code, agent-kit and Codex.

## Context

- Codex 0.146 installs Claude Code plugins but has no plugin settings (`userConfig`): it passes `${user_config.sites}`, `${user_config.headless}`… literally, so moodle-mcp fails on `MOODLE_MCP_HEADLESS=${user_config.headless}` or takes `${user_config.sites}` for a site.
- An empty variable already counts as unset (`pick` in `src/config.ts`); a placeholder doesn't.
- Without a site the server starts and asks for one (`configure`, `add_site` with elicitation): that's how a Codex user adds theirs, once, in the chat.

## Changes

- `src/config.ts`: a value that is a whole `${…}` placeholder, in an argument or a variable (`CLAUDE_PLUGIN_DATA` too), counts as not set; the setting gets its default.
- `Config.unexpanded`: the settings that came so, which `server_info` lists, so the person sees why a setting is its default.
- The instructions: with no site, ask the person for their Moodle site's address and add it with `add_site`.

## Acceptance

- `MOODLE_MCP_SITES=${user_config.sites}`, `MOODLE_MCP_HEADLESS=${user_config.headless}` and the rest start the server with defaults and no site; `server_info` names them.
- A test in `test/config.test.ts`; the settings page says it.
