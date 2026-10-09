# Engineering principles

Consult **before** writing code.

- Solve first, optimize later; readable code over clever code.
- Avoid premature abstractions; propose a simpler alternative before adding complexity.
- Preserve existing behavior; don't refactor outside the task's scope.
- Document decisions, not implementation.
- Generic: nothing about agent-kit, miyagi or any client in the code or the `instructions` (ADR-003).
- The server never types, stores or asks for a password; the person logs in by hand (ADR-002).
- Domain tools first (ADR-004); the generic browser tools are a guarded fallback for what none covers (ADR-010).
- Reading first: a write tool comes only after the read tools it relies on, and says so in its annotations.
- Moodle's pages, services and forms are the driver's business (ADR-014): no selector or service call in a tool.
- The browser profile lives outside the server's folder, and is never committed (ADR-002).
