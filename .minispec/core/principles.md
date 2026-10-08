# Engineering principles

Consult **before** writing code.

- Solve first, optimize later; readable code over clever code.
- Avoid premature abstractions; propose a simpler alternative before adding complexity.
- Preserve existing behavior; don't refactor outside the task's scope.
- Document decisions, not implementation.
- Generic: nothing about agent-kit, miyagi or any client in the code or the `instructions` (ADR-003).
- The server never types, stores or asks for a password; the person logs in by hand (ADR-002).
- Domain tools only; no generic click, type or navigate tool (ADR-004).
- Reading first: a write tool comes only after the read tools it relies on, and says so in its annotations.
- Moodle's HTML is not an API: each tool keeps its selectors to itself, prefers roles, labels and URLs over CSS classes, and fails with a clear message when the page isn't what it expects.
- The browser profile lives outside the server's folder, and is never committed (ADR-002).
