# Gradebook: CSV import, scales and letters

Issue: [#33](https://github.com/falkenslab/moodle-mcp/issues/33)

## Goal

A teacher imports a CSV of grades and manages scales and grade letters.

## Context

- Grades are set one by one and exported; nothing imports them or manages scales and letters.
- Driver functions: `importGrades` (with Moodle's preview), `courseScales`, `addScale`, `editScale`, `gradeLetters`, `setGradeLetters`.
- Waits on moodle-driver [#75](https://github.com/falkenslab/moodle-driver/issues/75): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `import_grades` from a local CSV: the preview first, applied only when confirmed; participants are identified in the file, so only with names in clear (as `export_grades`).
- `list_scales`, `add_scale`, `edit_scale`, `get_grade_letters`, `set_grade_letters` (teacher).

## Acceptance

- A CSV imported into a manual grade item, read back with `get_grader_report`; a scale added; grade letters changed and put back.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
