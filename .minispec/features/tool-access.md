# Read-only tools

Issue: [#8](https://github.com/falkenslab/moodle-mcp/issues/8)

## Goal

`MOODLE_MCP_ACCESS=read` leaves the agent only the tools that change nothing in Moodle, combined with the role, the scopes and the student data level.

## Context

- The limits so far are by role (ADR-018), by the data a tool touches (ADR-015) and by how others' data reaches the agent (ADR-016); none separates reading from writing: the `content` scope includes `create_activity` and `reset_course`. Today only a client's permissions can keep an agent to reading, and every client does it differently.
- Every tool already says whether it only reads (`readOnlyHint`), set one by one; some that look like reads change Moodle and aren't marked read-only (`get_lesson_page` starts the lesson, `open_scorm` and `start_quiz_attempt` open attempts).

## Changes

- `MOODLE_MCP_ACCESS` / `--access`: `read` or `write` (the default, every tool). Under `read`, a tool exists only when its `readOnlyHint` is true, the session tools that change no Moodle data aside (`login`, `logout`, `configure`, `show_browser` stay).
- `configure` can narrow `write` to `read`, never back; `server_info` and the instructions' limits line name it; the README's limits section and settings table.
- Tests: under `read` no tool without `readOnlyHint` is listed (but the session ones), a write tool called anyway is refused; it combines with the role (teacher + read: reading submissions, grades and reports, no grading).
- The tool counts per role with `read`, measured, in the README; an ADR beside ADR-018.

## Acceptance

- `MOODLE_MCP_ROLE=teacher MOODLE_MCP_ACCESS=read`: `get_submissions`, `get_grader_report`, `get_course_logs` listed; `grade_submission`, `create_activity`, `send_message` not.
- `configure` narrows to `read` and refuses going back; `--strict` clean.
