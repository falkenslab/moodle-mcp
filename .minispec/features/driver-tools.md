# Driver tools

## Goal

Each Moodle area moodle-driver gains becomes MCP tools here: a schema, a description, annotations and one driver call (ADR-014).

## Context

- The Moodle work is in moodle-driver's feature cards; this card tracks what to expose once each lands there. A tool's work here is small; take a row when its driver card is done.
- Tools that show other people go through `src/people.ts` (ADR-013, ADR-016): participants, gradebook, quiz results, completion report, messages.

## Changes

| moodle-driver card | Tools | Notes |
| --- | --- | --- |
| `messages-and-notifications` | `list_notifications`, `mark_notifications_read`, `list_conversations`, `get_conversation`, `send_message` | Pseudonymized; confirm before sending |

- Each tool's scope (ADR-015) comes from the driver categories of the functions it calls: list them in `TOOL_FUNCTIONS`.
- Each new AJAX-only tool gets its page in `src/tools/follow.ts`; each driver error class that needs a tool's name or a setting gets a line in `src/tools/errors.ts`.
- When moodle-driver's `api-tests` card is done, the tool tests here shrink to what MCP adds: schemas, annotations, error explanations, progress, following.

## Acceptance

- Per row: the tools listed, with annotations, `--strict` clean, a test against the fake Moodle, and the catalog's status updated.
