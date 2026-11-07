# Each tool's Moodle page in its result

Issue: [#56](https://github.com/falkenslab/moodle-mcp/issues/56)

## Goal

Every tool whose work has a page returns that page's absolute URL in its result's `_meta.page`, so a client can link the action to it ("View in the classroom") and the person opens it in their own browser.

## Context

- Requested for miyagi (falkenslab/miyagi#77): a link under each Moodle action in its chat. It replaces the screenshots of #55, dropped (and with them falkenslab/moodle-driver#94).
- Follow mode (ADR-011) knows only part of it. `src/tools/follow.ts` maps about 40 AJAX tools to their page from their inputs (`FOLLOWED_PAGES`, the driver's has the same with `(args, result)`). Every other tool's function opens its own tab and closes it; the page reaches only the driver's internal follower (`followPages`), not exported, which shows it only while a window is visible. Headless, this server never learns it.
- Where the driver knows it, it's the page as opened: for a creation, the form (`course/modedit.php?add=label&course=3…`), which as a link would add another activity instead of showing the one created.
- So the page of each function, including what a creation made (`mod/<type>/view.php?id=<new id>`, from the result), is Moodle knowledge and **needs moodle-driver first** (ADR-014): `FOLLOWED_PAGES` extended to every function with a page, from its arguments and result (falkenslab/moodle-driver#95). Here, each tool's function comes from `TOOL_FUNCTIONS` (`src/tools/scopes.ts`).
- Others' data: a URL can carry a person's Moodle id (`grader&userid=…`, `user/profile.php?id=…`). `_meta` is for the client, but nothing guarantees a client keeps it from the model.

## Changes

- A wrapper in `createServer` (or follow mode's, which already runs after each tool) that sets `_meta.page` from the driver's map for the tool's function, the arguments and the structured result, whether follow mode is on or not; follow mode shows the same URL.
- Under `pseudonymize` and `block`, no URL that names a person: the page without them (the grading list rather than the grader on one student), as `follow.ts` does for `grade_submission` by alias.
- A tool without a page, or whose page can't be told, returns no `page`. The content the model reads doesn't change.
- Docs, English and Spanish: limits or settings (what `_meta.page` is, for app builders); the developers page.

## Acceptance

- Tests: a read (`get_course_structure`) and a creation (`create_activity` gives the new activity's `view.php`) return their page; a tool without one returns no `page`; under `pseudonymize` no `page` holds a user id; the content is identical with and without it.
- The sandbox's course 3: hiding a label returns the course page's URL, and it opens there.
