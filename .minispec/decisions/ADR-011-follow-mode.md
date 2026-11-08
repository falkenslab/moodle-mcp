# ADR-011: Showing the browser on demand (follow mode)

## Decision

A `show_browser` tool (`visible: true | false`) shows or hides the browser when the person asks, during the session. Shown, the browser relaunches with a window (the session kept, ADR-007) and follows the tools: each one brings the Moodle page it works on to the front of one tab (the course page for its structure, the grading table for submissions…). Hidden, the window closes and tools go on headless. `headless` (variable, argument, `configure`) stays the starting mode. Replaces this ADR's first version, a fixed `follow` setting (changed by the owner, 9 October 2026).

## Motivation

Most tools work through AJAX from a hidden service tab (ADR-008), so even a visible browser shows almost nothing. Whether to watch is the person's call, made while the agent works ("show me what you're doing", "hide it"), not a setting chosen beforehand. Playwright can't add or remove a window from a running browser, so switching relaunches it; the saved session makes that cheap.

## Consequences

- Pages tools open themselves are followed while they work (`openSitePage`); then each tool's result page is shown, from the driver's `FOLLOWED_PAGES` for the calls it made (below). Showing is best effort and never changes a tool's result.
- Slower while shown (one more page load per call); no cost while hidden.
- A window the person closes counts as "hide"; open tabs don't survive a switch, what was saved in Moodle does.
- Without a screen (Linux without `DISPLAY` or `WAYLAND_DISPLAY`), `show_browser` fails with a clear message and the browser stays headless.
- The mechanism (relaunching, following, the working tab) is moodle-driver's ADR-007; the tool and its instructions stay here; each page is the driver's knowledge (ADR-014).
- Since moodle-driver 0.10 the driver knows each AJAX function's page too (`FOLLOWED_PAGES`) and follows them, but only through its own client (`createMoodle`); this server calls the functions directly, so `follow.ts` stays, kept in step with the driver's map (#44, 18 October 2026).
- Since moodle-driver 0.14 (#56, 8 November 2026) its `FOLLOWED_PAGES` gives every function's result page from its arguments and result (a creation, what it made). Tools import the driver from `src/driver.ts`, which records each call during a tool call; `follow.ts` takes the last call with a page, gives it in the result's `_meta.page` whether the browser is shown or not (for a client's link to it), and shows it while the person watches. Its own map is gone. Under `pseudonymize` and `block` a page naming a person by id (a profile, the grader on one student) isn't given.
