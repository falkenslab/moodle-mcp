# Browser fallback tools

## Goal

Generic browser tools on the server's own session, for what no domain tool covers yet (ADR-010).

## Context

- The runs needed SCORM upload, H5P, external escape rooms and rare settings; no domain tool will cover them soon.
- A separate Playwright MCP can't share the profile (ADR-002), so these live here.
- `principles.md` still says "no generic click, type or navigate tool": ADR-010 amends it.

## Changes

- `tools/browser.ts`: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select`, `browser_upload`, `browser_screenshot`, `browser_wait`, on one tab of the shared context.
- Guards in code: navigation only to the configured site's host; `browser_type` refuses password fields; snapshot = accessibility tree of `#region-main` (whole page on request), size-capped; no `evaluate`.
- Elements addressed by snapshot refs (role + name), not CSS.
- Annotations: snapshot and screenshot read-only; the rest writes.
- `instructions` and descriptions: only when no domain tool fits, naming the task.
- `principles.md`: the domain-tools-only line points at ADR-010.

## Acceptance

- In the sandbox, an agent can open a course's SCORM add form and upload a package with these tools alone.
- Navigating to another host, or typing into a password field, fails with a clear message.
- A snapshot of a quiz attempt page stays under the cap.
- `--strict` reports no warnings; tests run in Docker.
