# Questions of every type

Issue: [#43](https://github.com/falkenslab/moodle-mcp/issues/43)

## Goal

`create_question` and `update_question` make and change every question type, not only five.

## Context

- They take multiple choice, true/false, short answer, numerical and essay; any other type goes through GIFT or XML import, and some (drag and drop, ordering, CodeRunner) can't be written in GIFT.
- Waits on moodle-driver [#85](https://github.com/falkenslab/moodle-driver/issues/85): not started in moodle-driver yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `create_question` and `update_question` take every type the driver gives (core, and plugins where the site has them), with each type's inputs as optional fields (no unions of types), checked before Moodle.
- A site without a plugin answered with the driver's error naming it.

## Acceptance

- One question of each core type created and previewed without error in course 3's bank, one per family edited.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
