# SCORM tools

## Goal

An agent does a SCORM activity as a student would: `open_scorm` puts the player in the browser tools' tab, the browser fallback tools do the package inside its frame, and `get_scorm` says what Moodle recorded.

## Context

- A SCORM package is the teacher's own HTML and JavaScript in Moodle's player: no domain tool can answer it, the browser fallback tools (ADR-010, ADR-017) do.
- Tried on 11 October 2026 in the sandbox (course 3, activity 43, a SCORM 1.2 package made for the test), pseudonymized: a student did it with the fallback tools only; snapshots read the player's and the SCO's frames, clicks and typing by frame refs worked, Moodle recorded 100%. `browser_wait` didn't look inside frames: fixed (383ee3a).
- Waits on moodle-driver's `scorm` card (`scorm`, `openScorm`, packages in `createActivity`), implemented in its own session.

## Changes

- `get_scorm` (read-only): the activity, its attempts and grade, its SCOs with the person's status and score.
- `open_scorm` (a write: it starts or continues an attempt): enters the player on the browser tools' tab, at a SCO or the first; its description says the package is then done with the browser tools (refs inside frames start with `f`), and to check the result with `get_scorm` instead of assuming it.
- `create_activity`: `type: "scorm"` with the package in `files`, once the driver takes it.
- `TOOL_FUNCTIONS`: `get_scorm` → `scorm`; `open_scorm` → `openScorm` and the working tab (`BrowserManager.tab`), so it needs the `browser` scope as the fallback does.
- No tool marks a SCORM done or graded: only doing it in the player does (moodle-driver's card).
- Tests against the fake Moodle; a sandbox check as a student on activity 43.

## Acceptance

- In the sandbox, pseudonymized, as a student: `get_scorm` → `open_scorm` → the browser tools answer the package → `get_scorm` shows the new attempt's grade; no names other than the person's in any output.
- `--strict` clean; the catalog and the README list the tools.
