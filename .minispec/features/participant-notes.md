# Notes about participants

Issue: [#41](https://github.com/falkenslab/moodle-mcp/issues/41)

## Goal

A teacher reads and writes Moodle's notes about participants.

## Context

- Notes can't be read or written.
- Waits on moodle-driver [#83](https://github.com/falkenslab/moodle-driver/issues/83): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `list_notes`, `add_note`, `edit_note`, `delete_note` (teacher), once the driver has them.
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- A course note and a personal note about the student, read, edited and deleted.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
