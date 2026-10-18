# Course completion

Issue: [#31](https://github.com/falkenslab/moodle-mcp/issues/31)

## Goal

A teacher sets course completion's criteria and follows each participant's status.

## Context

- Activity completion is read and overridden; course completion isn't, and a badge's course completion criterion depends on it.
- Driver functions: `courseCompletionCriteria`, `setCourseCompletionCriteria`, `courseCompletionStatus`, `markCourseComplete`.
- Waits on moodle-driver [#73](https://github.com/falkenslab/moodle-driver/issues/73): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `get_course_completion_criteria` and `set_course_completion_criteria` (teacher).
- `get_course_completion_status` (participants as aliases) and `mark_course_complete` (teacher, grading scope).
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- Course 3 given activity and grade criteria, read back; a participant's status read before and after meeting them.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
