# list_courses

## Goal

The first domain tool, `list_courses`, returns the courses the logged-in person is enrolled in, as structured data.

## Context

- Needs a live session (`features/manual-login.md`).
- Moodle's "My courses" page (`my/courses.php`) renders its list with JavaScript from the AJAX service `core_course_get_enrolled_courses_by_timeline_classification`, called with the page's `sesskey`. Reading that response, or calling the service from the page, is language-independent (ADR-006); scraping the cards is not.
- The sandbox has `sandbox-course` (id 2) and the empty courses made with `npm run course`.

## Changes

- Choose how to read: the page's own AJAX service through the logged-in page, or the rendered list. If it's the service, record the rule ("Moodle's AJAX services are used through the page, never with a token") as an ADR.
- `tools/listCourses.ts`: input `classification` (`all` by default, `inprogress`, `future`, `past`); output a list of `{ id, shortname, fullname, category, url, visible, progress?, lastAccess? }`. Annotations: `readOnlyHint: true`.
- A shared helper to open a site page with the session check, for the tools that follow.
- Tests: the mapping from a saved service response (no real data from a real site); the tool with a fake browser.

## Acceptance

- As the sandbox's teacher, `list_courses` returns `sandbox-course` with id 2 and its URL.
- The same result with the teacher's interface language switched to Spanish.
- Logged out, it reports the missing session instead of an empty list.
- The Inspector's `--method tools/list --strict` reports no warnings.
