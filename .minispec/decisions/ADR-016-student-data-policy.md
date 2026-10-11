# ADR-016: One student data policy: block, pseudonymize or clear

## Decision

How the agent deals with other people's data is one setting, `MOODLE_MCP_STUDENT_DATA` (`--student-data`), with three levels from strictest to loosest:

- `block`: no tool that reads others' personal data or decides about others exists for the agent: the tools whose moodle-driver functions are `others-personal` or `others-write` (`DATA_CATEGORIES`, per module for activities) are not registered, nor the browser fallback tools (`any`); `download_file` refuses others' file areas. Building content, reading aggregates and the person's own data remain.
- `pseudonymize` (the default): those tools exist, and other people reach the agent as aliases, their free text redacted (ADR-013, `@falkenslab/pseudonym`); the browser fallback tools and others' files, which can't be pseudonymized, don't.
- `clear`: they exist with real names, for a model that runs locally; contact data and profile fields are still never given (ADR-013's minimization).

Only the person loosens it, at start-up in the client's configuration; `configure` can only tighten it for the session (`clear` → `pseudonymize` → `block`), never loosen it, or the agent could undo it. The scopes of ADR-015 stay for finer choices (no `communication`, no `as-student`, no `browser`), and `block` implies the scopes without `student-data` and `grading`. Replaces ADR-013's on/off switch (`MOODLE_MCP_PSEUDONYMIZE`), never implemented (decided by the owner, 11 October 2026).

## Motivation

The owner wants both: an agent that can't read or act on students' data at all (stricter than pseudonymizing it), and pseudonymization that can be turned off for local models. Three separate switches (pseudonymize, a scope, the browser tools) could contradict each other (pseudonymize off with student data blocked?); one ordered setting says how much reaches the model, and "only the person loosens it" applies the same way at every level.

## Consequences

- `server_info` and the instructions name the level, so the agent explains what it can't do instead of improvising.
- The tools' set depends on the level: tests cover the three, and the `--strict` check runs on `pseudonymize` (the largest set with aliases' schemas).
- Under `block`, pseudonym isn't needed at run time; under `clear`, the directory isn't written.
- What the model saw under `clear` can stay in the client's memory, history or knowledge base, and going back to `pseudonymize` doesn't remove it; post ids, dates and content let the agent match those names to aliases. The server can't see the client's memory, so it doesn't try to fix this (writing the directory under `clear` or telling the agent not to remember names were weighed: the first would make pseudonym, its key and a local record of students necessary where the person chose to do without them, the second goes against what `clear` is for). Loosening is always the person's deliberate act, at start-up, so the README warns them: a client configuration with its own memory for `clear`, and deleting that memory if it was mixed (decided by the owner, 11 October 2026).
- Nothing pretends to protect what it doesn't: until pseudonymization was in, `pseudonymize` was refused and the default was `clear`; it is the default since 11 October 2026.
