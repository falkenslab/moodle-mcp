# Question banks: export and categories

Issue: [#30](https://github.com/falkenslab/moodle-mcp/issues/30)

## Goal

A teacher exports a bank's questions and organises them in categories.

## Context

- Questions are imported, created and edited, not exported nor organised.
- Driver functions: `exportQuestions`, `questionCategories`, `addQuestionCategory`, `editQuestionCategory`, `deleteQuestionCategory`, `moveQuestions`.
- Waits on moodle-driver [#72](https://github.com/falkenslab/moodle-driver/issues/72): done in `../moodle-driver`'s main, not released yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `export_questions` (GIFT or Moodle XML to a local file; a bank or a category).
- `list_question_categories` (a tree), `add_question_category`, `edit_question_category` (rename, move), `delete_question_category`, `move_questions`.

## Acceptance

- A category added, questions moved into it and exported in both formats; the file read back by `validate_gift` and `import_questions`.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
