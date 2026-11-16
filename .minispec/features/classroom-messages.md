# Private messages within the classrooms

Issue: [#68](https://github.com/falkenslab/moodle-mcp/issues/68)

## Goal

With classrooms set (ADR-025), the agent can still send a private message, but only to a participant of one of the classrooms' courses.

## Context

Under classrooms, `send_message` is in `CLASSROOMS_OFF` (`src/tools/scopes.ts`), since a message can reach anyone on the site. That rules out a student writing to their course's teacher: padawan, which always runs held to the student's course, can only draft the message for the student to send by hand. Its own gate already limits messages to the teachers it saw; the server's check would be a second, independent one.

## Changes

- `send_message` out of `CLASSROOMS_OFF`; under classrooms, the recipient is checked against the classrooms' courses' participants (the driver's `participants`) before anything is sent, and refused with a clear error otherwise.
- `message_participants` allowed under classrooms when its `courseId` is a classroom (it already takes one).
- Conversations and notifications stay off: they show messages from anywhere.
- Tests against the fake Moodle; the classrooms page of the docs, in both languages; ADR-025 amended.

## Acceptance

- With classrooms set, `send_message` is listed.
- Sending to a participant of a classroom course works; anyone else is refused before Moodle.
- Without classrooms, nothing changes.
