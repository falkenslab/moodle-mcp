# Completion

## Goal

Manual completion for students; overrides and the progress report for teachers.

## Context

- `get_course_structure` already gives the person's completion state; nothing changes it.
- Teacher runs used the progress report for monitoring.
- AJAX: `core_completion_update_activity_completion_status_manually`, `core_completion_override_activity_completion_status`; the report is a page (`report/progress/index.php`).

## Changes

- `tools/setCompletion.ts`: `set_completion` (activity id, done or not); only manual completion; idempotent write.
- `tools/overrideCompletion.ts`: `override_completion` (activity, user, state); teachers only.
- `tools/getCompletionReport.ts`: participants by activities with their state, paginated; read-only.

## Acceptance

- As student, marking a manual-completion page done shows in `get_course_structure`.
- An activity with automatic completion gives a clear error.
- As teacher, the report of course 3 shows the student's row, and an override changes it.
