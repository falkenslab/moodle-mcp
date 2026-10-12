# ADR-020: Read-only access

## Decision

`MOODLE_MCP_ACCESS` (`--access`): `write` (the default, every tool) or `read`. Under `read`, a tool exists only when it declares itself read-only (`readOnlyHint: true`, set tool by tool and recorded as each one registers), besides the session tools (`login`, `logout`, `configure`, `show_browser`…), which change no Moodle data. It combines with the role (ADR-018), the scopes (ADR-015) and the student data level (ADR-016): a tool exists when all four allow it. Only the person sets it at start-up; `configure` can narrow `write` to `read`, never back. Decided by the owner, 12 October 2026.

## Motivation

None of the other limits separates reading from writing: the `content` scope includes `create_activity` and `reset_course`, the `teacher` role grading. Keeping an agent to reading depended on each client's permissions, which differ from client to client and don't shrink the tools a client loads. `readOnlyHint` was already set with care: tools that look like reads but change Moodle (`get_lesson_page` starts a lesson, `open_scorm` and `start_quiz_attempt` open attempts) aren't read-only, so they stay out.

## Consequences

- Measured on 12 October 2026, pseudonymized: `read` leaves 54 tools for `all` (about 9,800 tokens), 49 for `teacher` (8,900), 35 for `student` (6,400). The README gives them.
- A new tool's `readOnlyHint` now also decides whether it exists under `read`: it must be true only when the tool changes nothing in Moodle, logs aside.
- Tools that only read Moodle but save a file on the person's computer (`download_file`, `export_grades`) stay under `read` too, though their `readOnlyHint` is false: MCP counts the disk as the environment, so a client may still ask before each (`LOCAL_FILE_TOOLS` in `src/tools/scopes.ts`, decided by the owner on 13 October 2026). That makes 56 tools for `all`, 51 for `teacher` and 36 for `student`.
- `server_info` and the instructions' limits line say "read-only".
