# Pseudonymous mode

## Goal

Other people reach the client as stable aliases (`A-7K3F`), never as names or user ids, and the person resolves them on their own machine (ADR-013).

## Context

- Tools already send other people's data: `get_submissions` and `grade_submission` (names, submissions, grades), `list_discussions` and `get_discussion` (authors, posts), the browser fallback tools (any page).
- `participants-and-groups`, `gradebook` and `quiz-results` wait for this.

## Changes

- `moodle/people.ts`: the key (create, marker, refuse when lost), `aliasFor(siteUrl, userId)`, the encrypted local directory (record, look up), `redactText(text, people)`.
- `config.ts`: `pseudonymize` (variable, argument, `configure`), default true; `server_info` shows it.
- Minimization in every tool: no emails, phones, IPs, photos or profile fields of others.
- Existing tools through `people.ts`: names and user ids out, aliases in; write tools accept `user: "A-…"`.
- Browser tools: snapshots redacted, screenshots refused, in pseudonymous mode.
- CLI in `server.ts`: `whois`, `alias`, `aliases --course`, `key export | import | fingerprint`.
- README: what each tool sends, the mode, the key's backup, the client permissions that keep the agent away from the key and the CLI.

## Acceptance

- In the sandbox, `get_submissions` as teacher gives aliases only; the same student has the same alias after a restart and in another course.
- `grade_submission` with an alias grades the right student.
- `moodle-mcp whois <alias>` in the terminal gives the student's name; nothing the tools return contains a seeded student's name, email or user id (a test greps every output).
- With the key deleted after use, pseudonymous mode refuses with a clear message; `key import` of the exported key brings the same aliases back.
- With `--no-pseudonymize`, tools give names as today, still without emails.
