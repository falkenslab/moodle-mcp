# External tools (LTI)

Issue: [#42](https://github.com/falkenslab/moodle-mcp/issues/42)

## Goal

A teacher lists and adds a course's external tools and creates LTI activities from them.

## Context

- An LTI activity can be created with its form's fields only.
- Waits on moodle-driver [#84](https://github.com/falkenslab/moodle-driver/issues/84): not started in moodle-driver yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `list_external_tools`, `add_external_tool`, and `create_activity` taking a tool for an LTI activity, once the driver has them.

## Acceptance

- A course tool added to course 3 with a test URL and an LTI activity created from it.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
