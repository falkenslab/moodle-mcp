# ADR-010: Browser tools as a fallback, always available

When they're available is now the limits' (ADR-015's `browser` scope, ADR-016's levels, ADR-017 under pseudonymize); the rest stands.

## Decision

Besides the domain tools, the server always exposes a small set of generic browser tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select`, `browser_upload`, `browser_screenshot`, `browser_wait`) on the same session and profile, for what no domain tool covers. Amends ADR-004, which ruled them out.

## Motivation

The runs in `moodle-courses` needed operations no domain tool will cover soon (SCORM upload, H5P, external escape rooms, rare settings), and an agent with only domain tools would be stuck there. A separate `@playwright/mcp` can't share the profile (one browser per profile, ADR-002) and would need its own login. The owner chose them always on rather than behind a setting (decided 9 October 2026).

## Consequences

- The `instructions` and each tool's description say to use them only when no domain tool covers the task, and to name the task; those gaps decide which domain tool comes next.
- Guardrails in code, not in prompts: navigation stays on the configured site (and its files); typing into password fields is refused (ADR-002); snapshots cover the main region and are size-capped; no `evaluate`.
- Annotations: snapshot, screenshot and wait are read-only; the rest are writes, so clients can gate them, and a click is destructive (it may save, delete or submit).
- A link or redirect off the site is cancelled and reported, leaving the page where it was.
- Domain tools stay the norm (ADR-004's motivation holds): a task done often through the fallback becomes a domain tool.
- They work on moodle-driver's working tab (`BrowserManager.tab()`, its ADR-007); the tools and their guards stay here, as they're for agents.
