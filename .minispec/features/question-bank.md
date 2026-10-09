# Question bank

## Goal

List banks and questions, import GIFT or Moodle XML, and create a single question.

## Context

- The teacher run's quiz stayed empty after failing the question type chooser; GIFT was researched.
- Moodle 5 keeps banks as module instances (`question/banks.php`); questions list through a `core_question` fragment; import is a form with an upload (`question/bank/importquestions/import.php`).

## Changes

- `tools/questionBank.ts`: `list_question_banks`, `list_questions` (read-only); `import_questions` (bank, format, local file or text; returns the questions created) and `create_question` (type, text, answers, through the edit form), writes.
- Import is the main path; `create_question` is for one-offs.

## Acceptance

- A GIFT file with multichoice, true/false and short answer questions imports into course 3's bank, and `list_questions` shows them.
- A malformed file returns Moodle's parse errors.
