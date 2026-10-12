# Tools for a role

Issue: [#6](https://github.com/falkenslab/moodle-mcp/issues/6)

## Goal

`MOODLE_MCP_ROLE` (`teacher`, `student` or `all`) leaves the agent only the tools that role uses in Moodle, so a client loads fewer tools and the agent chooses among fewer.

## Context

- 136 tools since moodle-driver 0.5.1 (12 October 2026). Measured with the Inspector: their names, descriptions and input schemas are about 34,000 tokens; with output schemas, which some clients send too, about 80,000 (`create_activity` and `update_activity` the largest). Every request carries them; Claude Code defers MCP tools when there are many, other clients load them all. And an agent picks worse among 136 similar tools than among 40.
- The scopes (ADR-015) are by the data a tool touches, not by role: the `student` profile includes `content`, so a student gets `create_activity`, `import_questions` or `reset_course`, which Moodle won't let them use; a teacher gets `start_quiz_attempt` or `submit_assignment`, which they don't use.
- A role is per course in Moodle (a teacher in one course can be a student in another), so it can't be read from the session: the person says it.

## Changes

- Each tool's roles next to its driver functions (`TOOL_FUNCTIONS` or a sibling map in `src/tools/scopes.ts`): `student` (reading courses and their content, doing activities as a student, the person's own grades and to-dos, forums, messages, calendar), `teacher` (building, grading, participants, reports, managing the course; not the as-a-student tools), both for the session tools and what both use; a test fails on a tool without roles.
- `MOODLE_MCP_ROLE` / `--role`, default `all` (today's set). A tool exists only when the role, the scopes and the student data level all allow it; `configure` can narrow the role (`all` to one), never widen it, like the other limits (ADR-016).
- `server_info` and the instructions' limits line name the role; the README's limits section explains it next to the scopes.
- The token counts per role measured and written in the README (the Inspector's `tools/list`), so a person can choose.
- An ADR amending ADR-015: roles beside scopes.

## Acceptance

- With `MOODLE_MCP_ROLE=student`, `tools/list` has no tool a student can't use in Moodle (no `create_activity`, `grade_submission`, `reset_course`…) and keeps every one they can; with `teacher`, no as-a-student tools; `all` lists the 136.
- Role, scopes and student data combine: `teacher` with `content` leaves only building courses.
- `configure` narrows the role and refuses widening it; `--strict` is clean for each role.
