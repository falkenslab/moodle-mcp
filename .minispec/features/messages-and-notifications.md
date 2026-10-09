# Messages and notifications

## Goal

Read notifications and conversations, mark notifications read, and message a user.

## Context

- Students got forum-reply notifications and read them by hand; no run messaged anyone yet.
- AJAX: `message_popup_get_popup_notifications`, `core_message_mark_all_notifications_as_read`, `core_message_get_conversations`, `core_message_get_conversation_messages`, `core_message_send_instant_messages`.

## Changes

- `tools/notifications.ts`: `list_notifications` (read-only), `mark_notifications_read` (write, idempotent).
- `tools/messages.ts`: `list_conversations`, `get_conversation` (read-only); `send_message` (write: user id from `get_me` or the participants; refuses an empty text; the description asks to confirm with the person).

## Acceptance

- After a forum reply in the sandbox, the other user sees it in `list_notifications`, and none unread after marking.
- A message sent as teacher shows in the student's `get_conversation`.
