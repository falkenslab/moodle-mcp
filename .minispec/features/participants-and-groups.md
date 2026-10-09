# Participants and groups

## Goal

`list_participants`, with an inactivity filter, and `list_groups`.

## Context

- 3 teacher sessions read the participants table, telling roles apart by hand and reading last access.
- The participants page is a dynamic table (`core_table_dynamic_fetch` with `core_user\table\participants`); groups through `core_group_get_course_groups` and their members.
- Depends on `pseudonymous-mode.md` (ADR-013): participants are aliases, no emails; last access only as "inactive since".

## Changes

- `tools/listParticipants.ts`: input `courseId`, optional `role`, `group`, `inactiveSince`; alias (a name only with pseudonymous mode off), roles, groups, and with `inactiveSince` whether they've been inactive since then (no access times otherwise). Paginated; read-only. Covers the catalog's `list_inactive_participants`.
- `tools/listGroups.ts`: groups with their members; read-only.

## Acceptance

- Course 3 lists the teacher and the student with their roles; `inactiveSince` today leaves out whoever just logged in.
