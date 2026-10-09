# Site info and logout

## Goal

`get_site_info` tells what the site is and offers; `logout` ends the session to switch accounts.

## Context

- Teacher runs listed 19 activity types and 17 question types by hand.
- Switching teacher and student in the sandbox needs a logout; `login` only starts sessions.
- `tool_mobile_get_public_config` (no login needed) gives the site name, release and language; `core_courseformat_get_section_content_items` the activity types a course offers.

## Changes

- `tools/getSiteInfo.ts`: name, Moodle release, default language; with `courseId`, the activity types that can be added there. Read-only.
- `tools/logout.ts`: the logout link with the sesskey, the saved session cookies cleared (ADR-007), the service tabs closed.

## Acceptance

- In the sandbox, `get_site_info` gives Moodle 5.2 and, for course 3, `questionnaire` among the types.
- After `logout`, `get_me` fails naming `login`, and a restart doesn't bring the session back.
