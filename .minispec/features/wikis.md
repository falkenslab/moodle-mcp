# Wikis

Issue: [#32](https://github.com/falkenslab/moodle-mcp/issues/32)

## Goal

Teachers and students read and edit a wiki's pages.

## Context

- Nothing reads or writes a wiki.
- Waits on moodle-driver [#74](https://github.com/falkenslab/moodle-driver/issues/74): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `list_wiki_pages`, `get_wiki_page` (with its history), `create_wiki_page`, `edit_wiki_page` (both roles, embedded images, Moodle's edit lock respected), once the driver has them.
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- Pages created and edited by the teacher and the student, read with their history.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
