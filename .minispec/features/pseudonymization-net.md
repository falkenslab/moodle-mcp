# A pseudonymization net over every tool

Issue: [#7](https://github.com/falkenslab/moodle-mcp/issues/7)

## Goal

Under `pseudonymize`, nothing a tool returns or raises names someone the directory knows, or a user by id, whether or not the tool took care of it.

## Context

- Pseudonymization is one server-wide setting (ADR-016), but each tool applies it itself through `src/people.ts`: aliases for people, `text()` for free text. A tool that forgets reaches the agent unredacted; nothing catches it.
- Gaps seen on 12 October 2026: the driver's error messages pass as they are ("Moodle didn't send the message to user 7: …"); the driver's `changed` sentences only where a tool rewrote them; free text fields a tool didn't expect to name someone (a group's name, an event's title).

## Changes

- A wrapper on every tool, outermost (before `explainErrors`), active while the level is `pseudonymize`: every string of the structured output, at any depth, the text content and the error message go through pseudonym's `redact()` (known people to aliases; emails, phones, ID numbers, IBANs to placeholders), and user ids in text (`user 7`, `user with id '7'`, `userid=7`, profile links) are hidden. The session tools that show the person themselves (`get_me`, `server_info`…) are left alone.
- One `redact()` call per result where possible (the strings joined and split back), measured on a large output (course logs, a grader report).
- Tools keep doing their part (ids to aliases needs the names they have); the net catches what slips.
- Tests: a tool made for the test returning names, emails and user ids nested in its output and in an error, all redacted; the net off under `clear`.
- ADR-019; README's privacy section (one paragraph: what the net does and its limits).

## Acceptance

- Under `pseudonymize`, a driver error naming a user by id reaches the agent without the id; a name the directory knows, in any field of any tool's output, reaches it as the alias.
- Under `clear` and `block`, outputs are as before; `get_me` keeps the person's own email.
- Tests pass, `--strict` clean, a sandbox check of a few tools with the net on.
