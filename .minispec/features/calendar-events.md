# Calendar events

## Goal

`create_event` and `delete_event`: course calendar events.

## Context

- No run needed it yet; activities' due dates appear in the calendar without it.
- AJAX: `core_calendar_submit_create_update_form` (the form's data), `core_calendar_delete_calendar_events`.

## Changes

- `tools/calendarEvents.ts`: `create_event` (course, name, start, duration, description), `delete_event`; writes.
- `list_deadlines` (see `activities-overview.md`) shows them.

## Acceptance

- An event created in course 3 shows in the student's `list_deadlines`, and is gone after `delete_event`.
