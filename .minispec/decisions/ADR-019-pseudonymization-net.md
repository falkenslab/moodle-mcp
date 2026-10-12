# ADR-019: A pseudonymization net over every tool

## Decision

Under `pseudonymize`, every tool's result and error pass, on their way to the agent, through one more step (`src/tools/pseudonymizeOutput.ts`, the outermost wrapper): every string of the structured output at any depth, the text content that isn't the structured content's JSON, and the error message go through `redactAll()` (`src/people.ts`): user ids in text hidden (`user 7`, `users 7, 8`, `user with id '7'`, `userid=7`, profile links), then pseudonym's `redact()` in one call for the whole result (known people to aliases, emails, phones, ID numbers and IBANs to placeholders). A link only loses its user ids, so it still works. The session tools that show the person themselves (`get_me`, `server_info`, `list_courses`…) are left alone. Tools keep pseudonymizing what they hold (ids to aliases needs the names); the net catches what slips. Decided by the owner, 12 October 2026: pseudonymization is transversal to every tool that returns data.

## Motivation

Each tool applied ADR-013 and ADR-016 itself, so a tool that forgot reached the agent unredacted, and some text never went through it: the driver's errors ("Moodle didn't send the message to user 7: …"), the driver's `changed` sentences where a tool didn't rewrite them, free text fields nobody expected to name someone.

## Consequences

- One `redact()` call per result (the strings joined by a separator line, split back; one call each if a redaction ran across one): measured on course logs of 300 entries, about one second over `clear`, most of it the tool's own work.
- Its limits are redaction's: a name the directory doesn't know yet isn't found, and contact data in the course's own content (a teacher's email on a page) becomes a placeholder too. The person's own name stays, unless they are in their own directory (a shared test sandbox).
- A new tool that shows people still has to go through `people.ts` for ids and names; the net makes a slip a redacted string, not a leak.
