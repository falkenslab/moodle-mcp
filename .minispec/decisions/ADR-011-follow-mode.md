# ADR-011: Showing the browser on demand (follow mode)

## Decision

A `show_browser` tool (`visible: true | false`) shows or hides the browser when the person asks, during the session. Shown, the browser relaunches with a window (the session kept, ADR-007) and follows the tools: each one brings the Moodle page it works on to the front of one tab (the course page for its structure, the grading table for submissions…). Hidden, the window closes and tools go on headless. `headless` (variable, argument, `configure`) stays the starting mode. Replaces this ADR's first version, a fixed `follow` setting (changed by the owner, 9 October 2026).

## Motivation

Most tools work through AJAX from a hidden service tab (ADR-008), so even a visible browser shows almost nothing. Whether to watch is the person's call, made while the agent works ("show me what you're doing", "hide it"), not a setting chosen beforehand. Playwright can't add or remove a window from a running browser, so switching relaunches it; the saved session makes that cheap.

## Consequences

- Pages tools open themselves are followed when the tool is done with them (`openSitePage`, the URL it opened, never a POST's result); AJAX tools name their page in `tools/follow.ts`. Showing is best effort and never changes a tool's result.
- Slower while shown (one more page load per call); no cost while hidden.
- A window the person closes counts as "hide"; open tabs don't survive a switch, what was saved in Moodle does.
- Without a screen (Linux without `DISPLAY` or `WAYLAND_DISPLAY`), `show_browser` fails with a clear message and the browser stays headless.
- The mechanism (relaunching, following, the working tab) is moodle-driver's ADR-007; the tool, its instructions and each tool's page (`src/tools/follow.ts`) stay here.
- Since moodle-driver 0.10 the driver knows each AJAX function's page too (`FOLLOWED_PAGES`) and follows them, but only through its own client (`createMoodle`); this server calls the functions directly, so `follow.ts` stays, kept in step with the driver's map (#44, 18 October 2026).
