# Competencies

Issue: [#40](https://github.com/falkenslab/moodle-mcp/issues/40)

## Goal

A teacher links competencies to a course and its activities and rates participants in them.

## Context

- Nothing touches competencies.
- Waits on moodle-driver [#82](https://github.com/falkenslab/moodle-driver/issues/82): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `list_course_competencies`, `link_competency`, `unlink_competency`, `get_competency_ratings`, `rate_competency` (teacher, grading scope for ratings), once the driver has them.
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- Where competencies are enabled: a competency linked to course 3 and an activity, the student rated in it.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
