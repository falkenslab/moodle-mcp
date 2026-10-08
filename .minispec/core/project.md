# Project

## What

`moodle-mcp` is a generic MCP server that works a Moodle site through a real browser (Playwright), so any MCP client can read and, later, manage a course as the person logged in.

## What it does

- Exposes Moodle as domain tools (`list_courses`, `list_assignments`, `get_submissions`…), never as generic browser actions (ADR-004).
- Drives the system's Edge or Chrome with `playwright-core` (ADR-001), on a persistent profile where the person logs in by hand (ADR-002).
- Configured only by environment variables or arguments; its usage rules travel in the MCP server's `instructions` (ADR-003).
- Ships as one bundled `dist/server.mjs` with a `moodle-mcp` bin, over stdio (ADR-005).

## For whom

- Any MCP client: Claude Code, Claude Desktop, custom agents.
- First consumer: miyagi, a teacher's agent built on `@falkenslab/agent-kit`, through a separate Claude Code plugin that only starts this server and adds skills. This server knows nothing of either.

## Goal

Let an agent work in a Moodle course with the person's own session, through tools that speak Moodle's language, without ever handling the person's password.

## Status

Version 0.x: the server, its configuration and `server_info` exist; the Moodle tools come one by one (see `features/`).

## Test site

`../moodle-sandbox`: a Moodle in Docker with `sandbox-course` and teacher and student accounts (`npm run info -- --json`). Its credentials are for a person to type in the browser; they never appear in this repo.
