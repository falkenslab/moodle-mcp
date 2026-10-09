# Pseudonymous mode

## Goal

In moodle-mcp, other people reach the client as aliases from `@falkenslab/pseudonym`, never as names, emails or user ids (ADR-013).

## Context

- Tools already send other people's data: `get_submissions` and `grade_submission` (names, submissions, grades), `list_discussions` and `get_discussion` (authors, posts), the browser fallback tools (any page).
- Needs the sibling `pseudonym` repository's `key-and-aliases`, `directory` and `redaction` features (implemented in that repository's own session).
- `participants-and-groups`, `gradebook` and `quiz-results` wait for this.

## Changes

- `package.json`: `@falkenslab/pseudonym` from `file:../pseudonym` until it's published (esbuild bundles it); `scripts/in-docker.mjs` mounts the sibling folder so tests see it.
- `config.ts`: `pseudonymize` (variable, argument, `configure`), default true; `server_info` shows it.
- `moodle/people.ts`: a Moodle person to `remember()` (identifiers: the user's "ID number" field when set, the email, the Moodle user id at the site) and back with `resolve()`: `user: "A-…"` to the user id for write tools.
- Minimization in every tool: no emails, phones, IPs, photos or profile fields of others, whatever the mode.
- Existing tools through `people.ts`: names and user ids out, aliases in; URLs lose user ids.
- Free text (submissions, posts): through pseudonym's `redact()` (its ADR-005, `redaction` feature): known participants' names to aliases, then emails, Spanish phones, DNI, NIE and ES IBANs to placeholders. Street addresses and dates of birth stay undetected: the README says so.
- Browser fallback tools: snapshots redacted (known names, user ids in links), screenshots refused, in pseudonymous mode.
- README: what each tool sends, the mode, the key's backup, the client permissions that keep the agent away from the key folder and the CLI.

## Acceptance

- In the sandbox, `get_submissions` as teacher gives aliases only; the same student has the same alias after a restart and in another course.
- `grade_submission` with an alias grades the right student.
- `pseudonym whois <alias>` in the terminal gives the student's name; no tool output contains a seeded student's name, email or user id (a test greps every output).
- With `--no-pseudonymize`, tools give names as today, still without emails.
