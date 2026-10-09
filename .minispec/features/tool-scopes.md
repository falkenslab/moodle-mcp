# Tool scopes

## Goal

The person chooses at start-up which kinds of tools the agent gets (content, student data, grading, communication, as a student, browser), and the agent can't widen them (ADR-015).

## Context

- Today every tool is always there: an agent meant to build content can read submissions, grade and post.
- Needs moodle-driver's `data-categories` card (each public function declares the data it touches); this card starts when that's done there.
- The SDK's registered tools have `enable()`/`disable()` and the server can send `tools/list_changed`.

## Changes

- `config.ts`: `scopes` from `MOODLE_MCP_SCOPES` / `--scopes` (a profile, `all` by default, or a comma list); `configure` takes `scopes` and only accepts a subset of the start-up ones; `server_info` shows them.
- `src/tools/scopes.ts`: each tool's scope derived from the driver's categories of the functions it calls (declared next to each tool's registration), strictest wins; `any` → `browser`; session tools always in.
- `createServer.ts`: tools outside the scopes not registered; narrowing later disables them and sends `list_changed`; a wrapper refuses calls to disabled tools without touching Moodle.
- Under profiles without `student-data`: `delete_activity` and `delete_section` refuse activities holding others' work (the overview's counts); `download_file` refuses `pluginfile.php` URLs of others' components.
- `instructions.ts`: the active scopes, and what to say when asked for something outside them.
- README: the scopes and profiles, and that they're set in the client's configuration, not by the agent.

## Acceptance

- With `--scopes content`, `tools/list` has the content and session tools only: no `get_submissions`, `grade_submission`, `reply_to_post`, `create_discussion`, quiz attempt or `browser_*` tools.
- `configure` with `scopes: ["content", "grading"]` under `content` is refused; narrowing `teacher` to `content` hides the other tools and a call to one is refused.
- Under `content`, deleting an activity with submissions is refused; downloading an assignment's submitted file is refused, a resource's file isn't.
- `--strict` reports no warnings; tests in Docker.
