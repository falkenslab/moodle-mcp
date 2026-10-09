# Follow mode

## Goal

With a visible browser, each domain tool shows the Moodle page it works on, so a person can follow the agent (ADR-011).

## Context

- Most tools work through AJAX from a hidden service tab (ADR-008); a headed browser shows almost nothing.
- `headless` already exists in `Config`; `follow` is a separate setting.

## Changes

- `config.ts`: `follow` (`MOODLE_MCP_FOLLOW`, `--follow`, `configure`), off by default.
- `browser.ts`: one "follow" tab, brought to front; `show(path)` loads it, best effort, never failing the tool.
- Each domain tool names its page (course page, grading table, discussion, quiz attempt…) and calls `show()` when `follow` is on.
- `server_info`: says when `follow` has no effect (headless).

## Acceptance

- Headed with `follow` on, `get_course_structure` leaves the course page in front; `grade_submission` the grader on that participant.
- With `follow` off, no extra page loads (tests count the pages served).
- A failing `show()` doesn't change the tool's result.
