# ADR-014: The Moodle code is moodle-driver, a sibling library

## Decision

Everything that works Moodle with the person's session (the browser and its profile, manual login, session cookies, AJAX services through the page, forms, pages, and each Moodle area's reads and writes) is a library, `@falkenslab/moodle-driver`, with no MCP in it. It lives in the sibling repository `moodle-driver` (extracted on 9 October 2026, sooner than first planned, at the owner's request): moodle-mcp depends on it from npm (published since 0.3.1, 11 October 2026; `file:../moodle-driver` before) and its tools are a schema, a description and one driver call.

## Motivation

The existing Moodle MCP servers and npm clients (moodle-client, moodle-webservice, joodle, csmediapro's and others' MCP servers) all use Moodle's web services with a token, which many institutions don't enable for students or teachers; the one browser-session server found relays commands through a hosted third party. Working Moodle with the person's own session, locally, is what this code does that none of them does, and it's useful without agents. `src/moodle/` already depends on nothing of MCP but `config.ts` in one place. The owner chose to extract it at once rather than keep a boundary inside this repository first. "Driver" because it drives Moodle as a person would (as WebDriver drives a browser), and because `moodle-client` names a token-based package on npm; `moodle-browser`, `moodle-session`, `moodle-handler` and `moodle-broker` were considered.

## Consequences

- moodle-mcp keeps what only an MCP server needs: `configure`, the instructions, tool schemas and descriptions, follow mode's page per tool, the browser fallback tools.
- The driver takes plain options (site URL, profile folder, channel, headless, trail) instead of moodle-mcp's `Config`; `Config` satisfies its `BrowserOptions`, so `configure` keeps working.
- Its errors name no tool: `src/tools/errors.ts` explains them in this server's terms (call `login`, `MOODLE_MCP_*`).
- Its decisions moved there (this repository's ADR-001, 002, 007, 008 and 012 point to them); new Moodle areas are its feature cards, and the tools that expose them are tracked here (`driver-tools`).
