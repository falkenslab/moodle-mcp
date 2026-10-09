# Quiz structure

## Goal

`get_quiz_structure` and `add_questions_to_quiz`: what a quiz holds, and filling it from the bank.

## Context

- 13 quiz editor loads in teacher runs; one quiz stayed empty.
- `mod/quiz/edit.php` holds slots and pages; Moodle 5's `quiz_add_quiz_question` needs the page (seen while seeding the sandbox); random questions through `mod_quiz_add_random_questions`.
- Takes question ids from `question-bank`.

## Changes

- `tools/quizStructure.ts`: `get_quiz_structure` (slots: number, page, question id, type, name, mark), read-only; `add_questions_to_quiz` (question ids, or random ones from a category, and a page), write.

## Acceptance

- Questions imported into course 3's bank are added to its quiz, and a student attempt shows them.
