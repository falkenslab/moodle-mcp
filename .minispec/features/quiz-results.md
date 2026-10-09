# Quiz results

## Goal

`get_quiz_results`: a quiz's attempts with grades and per-question marks.

## Context

- A teacher run read the quiz overview report.
- `mod/quiz/report.php?mode=overview` is a dynamic table; `mode=responses` gives the answers.

## Changes

- `tools/getQuizResults.ts`: input `activityId`, optional `responses`; per attempt the user, state, dates, grade and marks per slot (answers too with `responses`). Paginated; read-only.

## Acceptance

- After a student attempt in course 3, the teacher sees it with the grade `get_attempt_review` gives.
