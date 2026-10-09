# Activities overview and deadlines

## Goal

`get_activities_overview`, `list_deadlines` and `get_course_updates`: what's due, what needs grading and what changed, without opening each activity.

## Context

- Teachers asked "are there submissions pending to grade?"; students read deadlines off course pages.
- Moodle 5.x has `core_courseformat_get_overview_information`; the calendar `core_calendar_get_action_events_by_timesort` (all courses) and `core_calendar_get_action_events_by_course`; `core_course_get_updates_since`. Whether each is callable through AJAX is to confirm in the sandbox.

## Changes

- `tools/getActivitiesOverview.ts`: input `courseId`, `type`; per activity its due date and the submitted and to-grade counts Moodle gives.
- `tools/listDeadlines.ts`: input optional `courseId`, `days`; events with activity id, type, due date, whether there's something to do.
- `tools/getCourseUpdates.ts`: input `courseId`, `since`; the activities changed and what changed.
- All read-only.

## Acceptance

- As teacher, the overview of course 3's assignments shows the submissions waiting.
- As student, `list_deadlines` lists the quiz and assignment due dates of course 3.
- A course the person can't see gives Moodle's error.
