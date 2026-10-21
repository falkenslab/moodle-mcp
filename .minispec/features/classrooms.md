# Classrooms

Issue: [#51](https://github.com/falkenslab/moodle-mcp/issues/51)

## Goal

The person gives the URLs of the courses the agent may work in, on one site or several, and the server holds the agent to them, invented ids included (ADR-025).

## Context

- Today the limits are by kind of tool (role, access, scopes); nothing limits by course. A teacher's agent sees and can act on every course of theirs, and a site's ids are unique across the site, so checking `courseId` isn't enough.
- `MOODLE_MCP_SITES` names sites to log in to; a classroom's URL gives its site too.

## Changes

- `MOODLE_MCP_COURSES` (`--courses`): course URLs; the sites derived from them; `server_info` and `configure` (narrow only).
- A wrapper in `createServer` (like `scopeTools`): checks inputs (`courseId` in the classrooms; other ids seen, by kind), records the ids of outputs by kind, filters cross-course lists. A table of each tool's id inputs and output paths, with a test that every id input has a source.
- Off with classrooms: the browser fallback tools and messaging users.
- Docs: the settings, the limits page (a section on classrooms), the several sites page; the tools reference says which tools are off.

## Acceptance

- With two classrooms on two sites: lists show only them; a tool on another course, or with an id never seen, is refused with how to get it; with ids read from a classroom, tools work as before.
- Without `MOODLE_MCP_COURSES`, nothing changes.
- Tests against the fake Moodle; a sandbox check on course 3, with course 2 refused.
