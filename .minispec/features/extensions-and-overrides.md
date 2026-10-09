# Extensions and overrides

## Goal

`grant_extension` for assignments and `set_quiz_override` for quizzes: dates for some people.

## Context

- No run needed them yet; common teacher requests.
- Assignment: the form at `mod/assign/view.php?action=grantextension`; quiz: AJAX `mod_quiz_save_overrides` (5.x), availability to confirm.

## Changes

- `tools/grantExtension.ts`: activity, user ids, new date; write.
- `tools/setQuizOverride.ts`: quiz, user, open and close dates, time limit, attempts; write.
- `get_submissions` shows extensions when present.

## Acceptance

- The student in course 3 gets an extension, and their `get_assignment` shows the new date.
- A quiz override shows in the student's `get_quiz_info`.
