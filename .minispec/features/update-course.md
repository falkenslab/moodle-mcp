# Update course

## Goal

`update_course`: change a course's full name, short name, summary and other settings.

## Context

- A teacher run renamed a course after approval.
- `course/edit.php?id=` is a form; `openForm`, `setFields` and `submitForm` already handle such forms.

## Changes

- `tools/updateCourse.ts`: input `courseId`, optional `fullName`, `shortName`, `summary`, `settings` (by form field name); idempotent write; the description asks to confirm with the person.

## Acceptance

- Course 3's summary changes, and `list_courses` shows a new name.
- A duplicate short name returns Moodle's form error.
