# Activity settings

## Goal

`get_activity`: one activity's settings as its form holds them, so `update_activity` edits from what's there.

## Context

- Teacher runs started 16 edits from `modedit.php?update=`.
- The catalog's `get_assignment_settings` is this tool on an assignment; `update_activity` already writes by form field name.

## Changes

- `tools/getActivity.ts`: input `activityId`; output name, type, description and every form field (name, label, value, options) from `course/modedit.php?update=`. Teachers only; read-only, never submits.
- Catalog: `get_assignment_settings` done through it.

## Acceptance

- For the sandbox assignment, it gives the due date, submission types and max grade; one field fed back to `update_activity` changes only that.
- As student, a clear error.
