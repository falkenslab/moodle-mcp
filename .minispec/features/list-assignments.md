# list_assignments

## Goal

`list_assignments` returns the assignments of a course, as structured data, without loading Moodle pages.

## Context

- `core_courseformat_get_state` (AJAX, `courseid`) returns the course's sections and activities as a JSON string: each activity's id (the course module id), name, `module` (`assign`), URL, visibility and section id; each section's number and title (confirmed empirically, Moodle 5.2 sandbox).
- `mod_assign_get_assignments`, with dates and settings, isn't available through AJAX; `mod_assign_list_participants` and `mod_assign_get_participant` are, but take the assignment's instance id, which only the grader page shows (`data-assignmentid`): one slow page per assignment, so it belongs to the submissions tool, not to this list.

## Changes

- `tools/listAssignments.ts`: input `courseId`; output `{ assignments: [{ id, name, url, visible, section: { number, title } }] }`, `id` being the course module id the other assignment tools will take. Annotations: `readOnlyHint: true`.
- Tests: the mapping from a saved state (made-up data); the tool against the fake Moodle.

## Acceptance

- As the sandbox's teacher, `list_assignments` for course 2 returns "Tarea de prueba" with id 3 and its URL.
- A course that doesn't exist or the person can't see gives Moodle's error, not an empty list.
- `--strict` reports no warnings.
