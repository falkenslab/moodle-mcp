# Follow mode from moodle-driver's map of pages

Issue: [#44](https://github.com/falkenslab/moodle-mcp/issues/44)

## Goal

Follow mode keeps working the same for the person, with the page each AJAX tool shows coming from moodle-driver instead of a list kept here.

## Context

- `src/tools/follow.ts` maps 41 AJAX tools to the Moodle page that shows their work, and wraps `registerTool` to bring it to the front while the browser is visible (ADR-011).
- That map is Moodle knowledge: the driver's shell shows nothing for AJAX functions without it.
- moodle-driver 0.10.0 has it (#88): `FOLLOWED_PAGES` maps each AJAX function to its page, `([args], result) => path`, and its client (`createMoodle`) follows them while the browser is visible. moodle-mcp calls the functions directly, not through that client, so nothing follows by itself here.

## Changes

- Keep `followTools` (it knows which tool ran and when), but take each page from the driver's `FOLLOWED_PAGES` by the tool's driver function (`TOOL_FUNCTIONS`) and its arguments in the driver's order, instead of our own paths; new AJAX tools then follow with no line here. Or call the functions through the driver's client: a larger change, its own ADR.
- ADR-011 updated: the driver knows and follows the pages, moodle-mcp keeps `show_browser` and when to use it.
- The follow tests moved to what moodle-mcp still owns.

## Acceptance

- With `show_browser` on, `list_courses`, `get_course_structure`, `get_discussion`, `grade_submission` and `edit_activity` leave their page in front, as today; hidden, no extra page load.
- Tests in Docker, `--strict` with no warnings, a sandbox check with a visible browser (in Docker, `xvfb-run`).
