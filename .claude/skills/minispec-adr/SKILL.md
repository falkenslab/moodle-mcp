---
name: minispec-adr
description: Record an architectural decision as a new ADR under .minispec/decisions/ from the ADR template. Use when an important, hard-to-reverse decision is made.
---

# MiniSpec: new ADR

Record a permanent architectural decision under `.minispec/decisions/`.

## Steps

1. Read `.minispec/README.md` for the standard.
2. Read the template `.minispec/templates/adr.md`.
3. Decide where it belongs: a decision about working Moodle (the browser, sessions,
   services, pages, an area's behavior) is moodle-driver's; about aliases or redaction,
   pseudonym's. Those are recorded in their repositories, from their sessions. Here go
   decisions about the MCP server: tools, settings, instructions, what reaches clients.
4. Determine the next sequential number: list `.minispec/decisions/`, find the
   highest `ADR-NNN-*` and add 1. Numbers are never reused or renumbered; an ADR whose
   decision moved elsewhere stays as a pointer (see ADR-001, 002, 007, 008, 012).
5. Create `.minispec/decisions/ADR-NNN-<slug>.md` with `<slug>` in kebab-case.
6. Fill the three sections:
   - **Decision** — what was decided, one or two sentences.
   - **Motivation** — why; what problem it solves, what was rejected. When the owner
     decided it, say so with the date.
   - **Consequences** — what it commits us to; trade-offs, follow-ups.

## Rules

- One page. No more. Document the *why*, not the implementation. English.
- Only record decisions that are important and worth not re-litigating. Don't
  write an ADR for plain stack facts.
- If the decision changes a rule, also update `.minispec/core/conventions.md`.
- If it replaces an earlier decision, update or point the earlier ADR to it.
