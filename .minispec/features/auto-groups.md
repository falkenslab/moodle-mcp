# Groups created automatically

Issue: [#34](https://github.com/falkenslab/moodle-mcp/issues/34)

## Goal

A teacher splits a course's students into groups at once, as Moodle's auto-create does.

## Context

- Groups are created one by one.
- Waits on moodle-driver [#76](https://github.com/falkenslab/moodle-driver/issues/76): not started in moodle-driver yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `auto_create_groups`: by number of groups or members, from a role, cohort or grouping, random or alphabetical, a naming scheme, optionally a new grouping; Moodle's preview first, then confirmed. Optionally `import_groups` from CSV.

## Acceptance

- Course 3's students split into two groups in a new grouping, previewed and created.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
