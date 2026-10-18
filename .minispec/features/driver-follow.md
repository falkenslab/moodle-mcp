# Follow mode from moodle-driver's map of pages

Issue: [#44](https://github.com/falkenslab/moodle-mcp/issues/44)

## Goal

Follow mode keeps working the same for the person, with the page each AJAX tool shows coming from moodle-driver instead of a list kept here.

## Context

- `src/tools/follow.ts` maps 41 AJAX tools to the Moodle page that shows their work, and wraps `registerTool` to bring it to the front while the browser is visible (ADR-011).
- That map is Moodle knowledge: the driver's shell shows nothing for AJAX functions without it.
- Waits on moodle-driver [#88](https://github.com/falkenslab/moodle-driver/issues/88): not started. A release, then a version bump here (`upgrade-deps`).

## Changes

- Remove `follow.ts` and `followTools` once the driver follows its AJAX functions itself; or, if it only exports the map, read the driver's map instead of ours.
- ADR-011 updated: the driver knows and follows the pages, moodle-mcp keeps `show_browser` and when to use it.
- The follow tests moved to what moodle-mcp still owns.

## Acceptance

- With `show_browser` on, `list_courses`, `get_course_structure`, `get_discussion`, `grade_submission` and `edit_activity` leave their page in front, as today; hidden, no extra page load.
- Tests in Docker, `--strict` with no warnings, a sandbox check with a visible browser (in Docker, `xvfb-run`).
