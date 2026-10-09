# Project

## What

`moodle-mcp` is a generic MCP server that works a Moodle site through a real browser (Playwright), so any MCP client can read and, later, manage a course as the person logged in.

## What it does

- Exposes Moodle as domain tools (`list_courses`, `list_assignments`, `get_submissions`…), never as generic browser actions (ADR-004).
- Drives the system's Edge or Chrome with `playwright-core`, or Chromium downloaded on first use when there is neither (ADR-001), on a persistent profile where the person logs in by hand (ADR-002).
- Configured at run time by the client with `configure`, or by optional environment variables and arguments (ADR-003, ADR-009); its usage rules travel in the MCP server's `instructions`.
- Ships as one bundled `dist/server.mjs` with a `moodle-mcp` bin, over stdio (ADR-005).

## For whom

- Any MCP client: Claude Code, Claude Desktop, custom agents.
- First consumer: miyagi, a teacher's agent built on `@falkenslab/agent-kit`, through a separate Claude Code plugin that only starts this server and adds skills. This server knows nothing of either.

## Goal

Let an agent work in a Moodle course with the person's own session, through tools that speak Moodle's language, without ever handling the person's password.

## Status

Version 0.x: the server, its configuration, `configure`, `login`, `get_me`, `list_courses`, `get_course_structure`, `get_activity_content`, `list_assignments`, `get_submissions`, `list_discussions`, `get_discussion`, `get_my_grades`, `list_pending`, the course layout tools (`edit_activity`, `duplicate_activity`, `delete_activity`, `add_section`, `edit_section`, `delete_section`) and `server_info` exist; the Moodle tools come one by one (see `features/`).

## Test site

`../moodle-sandbox`: a Moodle in Docker with `sandbox-course` and teacher and student accounts (`npm run info -- --json`). Its credentials are for a person to type in the browser; they never appear in this repo.
