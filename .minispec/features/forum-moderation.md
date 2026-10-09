# Forum moderation

## Goal

`set_discussion_state`: pin, unpin, lock and unlock discussions.

## Context

- No run needed it yet; small and cheap.
- AJAX: `mod_forum_set_pin_state`, `mod_forum_set_lock_state` (forum and discussion ids from `list_discussions`).

## Changes

- `tools/setDiscussionState.ts`: input forum, discussion, `pinned`, `locked`; idempotent write.
- `list_discussions` reports pinned and locked.

## Acceptance

- A discussion in course 3 is pinned and locked; `list_discussions` shows it, and the student can't reply.
