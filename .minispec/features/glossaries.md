# Glossaries

Issue: [#26](https://github.com/falkenslab/moodle-mcp/issues/26)

## Goal

Teachers and students read and write a glossary's entries, and teachers approve them, without the browser.

## Context

- Nothing in moodle-mcp touches a glossary, one of the most used activities.
- Driver functions: `glossaryEntries`, `addGlossaryEntry`, `editGlossaryEntry`, `deleteGlossaryEntry`, `setGlossaryEntryApproved`, `glossaryCategories`, `addGlossaryCategory`, `exportGlossaryEntries`, `importGlossaryEntries`.
- Waits on moodle-driver [#68](https://github.com/falkenslab/moodle-driver/issues/68): done in `../moodle-driver`'s main, not released yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `list_glossary_entries` (both roles, paged, by letter or search), `add_glossary_entry`, `edit_glossary_entry`, `delete_glossary_entry` (both roles where the glossary allows), `set_glossary_entry_approved` (teacher).
- `list_glossary_categories`, `add_glossary_category`; `export_glossary` and `import_glossary` with Moodle's XML, as local files.
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- Entries added as the teacher and as the student (one pending approval), read, edited, approved and deleted; authors as aliases.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
