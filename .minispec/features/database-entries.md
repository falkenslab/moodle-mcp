# A database's entries

Issue: [#27](https://github.com/falkenslab/moodle-mcp/issues/27)

## Goal

A database activity can be filled, reviewed and moderated through the tools, not only set up.

## Context

- Its fields, templates and presets are tools since 0.3.0; its entries aren't.
- Driver functions: `databaseEntries`, `addDatabaseEntry`, `editDatabaseEntry`, `deleteDatabaseEntry`, `setDatabaseEntryApproved`, `exportDatabaseEntries`, `importDatabaseEntries`.
- Waits on moodle-driver [#69](https://github.com/falkenslab/moodle-driver/issues/69): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `list_database_entries` (both roles, paged, with search: each field's value by name), `add_database_entry`, `edit_database_entry`, `delete_database_entry` (local files for file and picture fields), `set_database_entry_approved` (teacher).
- `export_database_entries` and `import_database_entries` (CSV, local files): names only with names in clear, as `export_grades`.
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- Entries added by the teacher and the student, read, edited, approved, exported and deleted.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
