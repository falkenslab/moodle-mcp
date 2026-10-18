# Course blocks

Issue: [#37](https://github.com/falkenslab/moodle-mcp/issues/37)

## Goal

A teacher adds and arranges a course's blocks, such as a text block with its welcome.

## Context

- Nothing reads or changes blocks.
- Driver functions: `courseBlocks`, `addBlock`, `configureBlock`, `moveBlock`, `deleteBlock`.
- Waits on moodle-driver [#79](https://github.com/falkenslab/moodle-driver/issues/79): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `list_course_blocks`, `add_block` (a text block's title and HTML with embedded images, other core blocks by name), `configure_block`, `move_block`, `delete_block` (teacher).

## Acceptance

- Course 3 given a text block, changed, moved and removed.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
