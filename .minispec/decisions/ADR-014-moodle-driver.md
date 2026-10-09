# ADR-014: The Moodle code becomes moodle-driver, extracted when a second consumer needs it

## Decision

Everything that works Moodle with the person's session (the browser and its profile, manual login, session cookies, AJAX services through the page, forms, pages, and each Moodle area's reads and writes) is a library-to-be, `@falkenslab/moodle-driver`, with no MCP in it. For now it stays in this repository, behind a clean boundary (`src/driver/`, its own public API, a lint rule that keeps MCP out); it moves to a sibling repository when a second consumer exists, such as a CLI that imports and exports activities without any agent (decided by the owner, 9 October 2026).

## Motivation

The existing Moodle MCP servers and npm clients (moodle-client, moodle-webservice, joodle, csmediapro's and others' MCP servers) all use Moodle's web services with a token, which many institutions don't enable for students or teachers; the one browser-session server found relays commands through a hosted third party. Working Moodle with the person's own session, locally, is what this code does that none of them does, and it's useful without agents. `src/moodle/` already depends on nothing of MCP but `config.ts` in one place. Extracting now, with one consumer, would shape the API after moodle-mcp alone; a clean boundary costs little and makes the later move mostly moving folders. "Driver" because it drives Moodle as a person would (as WebDriver drives a browser), and because `moodle-client` names a token-based package on npm; `moodle-browser`, `moodle-session`, `moodle-handler` and `moodle-broker` were considered.

## Consequences

- moodle-mcp keeps what only an MCP server needs: `configure`, the instructions, tool schemas and descriptions, follow mode's page per tool, the browser fallback tools.
- The driver takes plain options (site URL, profile folder, channel, headless, trail) instead of moodle-mcp's `Config`, and its errors are its own.
- Once extracted, it gets semver and its own documentation; until then its API can change freely.
