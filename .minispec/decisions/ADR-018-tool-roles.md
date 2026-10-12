# ADR-018: Tools for a role, beside the scopes

## Decision

`MOODLE_MCP_ROLE` (`--role`): `teacher`, `student` or `all` (the default). Each tool is listed with the roles that use it in Moodle (`src/tools/roles.ts`): a student's own work (doing activities, their grades and to-dos), a teacher's (building and managing courses, grading, people, reports), and both (the session, reading a course, forums, messages, the calendar, the browser fallback). A tool exists when the role, the scopes (ADR-015) and the student data level (ADR-016) all allow it. Like those, only the person sets it at start-up; `configure` can narrow `all` to one role, never change a role or go back to `all`. Amends ADR-015 (decided by the owner, 12 October 2026).

## Motivation

With moodle-driver 0.5.1 the server had 137 tools: their names, descriptions and input schemas are about 34,000 tokens of every request (about 83,000 when a client also sends output schemas), and an agent picks worse among that many. The scopes are by data, not by role: their `student` profile still offered `create_activity` or `reset_course`, which Moodle won't let a student use. Reading the role from Moodle was ruled out: it's per course (a teacher in one course is a student in another), so the person says it.

## Consequences

- Measured on 12 October 2026, pseudonymized: `all` 137 tools (about 34,500 tokens), `teacher` 121 (31,000), `student` 61 (12,500), `teacher` with the `content` scope 66 (17,000). The README gives them.
- The scopes' `teacher` and `student` profiles stay: they limit data, the role limits tasks; the README explains both.
- A new tool goes in one of the three lists, or a test fails; outside them it exists only for `all`.
- `server_info` and the instructions' limits line name the role.
