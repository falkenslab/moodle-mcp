# ADR-004: Domain tools, not browser tools

> Amended by ADR-010: a small set of generic browser tools is always available as a fallback.

## Decision

The server exposes Moodle tasks as tools (`list_courses`, `list_assignments`, `get_submissions`…), with Playwright inside. It never exposes generic browser actions (click, type, navigate, snapshot) as `@playwright/mcp` does. Tools that only read are annotated `readOnlyHint: true`.

## Motivation

Generic browser tools make the model rediscover Moodle's pages on every run: many calls, many tokens, fragile results and no way to tell a read from a write. Domain tools return compact structured data, can be approved by kind (read-only ones freely), and keep the knowledge of Moodle's HTML in tested code.

## Consequences

- Every new capability is a tool written and tested against a real Moodle (`../moodle-sandbox`).
- Tool annotations are mandatory, so clients can allow reads and gate writes.
- When Moodle changes its pages, a tool breaks and is fixed in one place; tools fail with a clear message instead of guessing.
