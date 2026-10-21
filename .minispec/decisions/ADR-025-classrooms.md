# ADR-025: Classrooms: the agent works only in the courses the person gives

## Decision

`MOODLE_MCP_COURSES` (`--courses`) lists the person's classrooms by their courses' URLs, on one site or several. When it's set, the server works only in them:

- The sites come from the URLs (one per origin); `MOODLE_MCP_SITES` isn't needed.
- A `courseId` input must be one of the classrooms. Any other id an input takes (an activity, a submission, a discussion, a post, a question…) must be one the server has **seen** in this session in a tool's output from a classroom, recorded with its kind (where it appeared in the output: `activities[].id` is an activity). An unseen id is refused, with how to get it (read the course first). Nothing asks Moodle which course an id belongs to.
- Lists across courses (pending work, deadlines, notifications, courses) keep only the classrooms' items.
- Tools that can't be held to the classrooms are off: the browser fallback tools (any page of the site) and messaging users (anyone on the site).
- Like the other limits, `configure` can narrow the classrooms, never widen them; `server_info` gives them.

Decided by the owner, 21 October 2026.

## Motivation

A teacher's account sees every course they teach, last year's too, and a site's ids are unique across the site, not per course: an agent could act on a course it wasn't meant to, by a similar name or by an id it guessed or remembered. Checking only `courseId` misses that. Asking Moodle the course of every id would need a lookup per kind of id in moodle-driver and a call per new id; the seen ids need neither, cost nothing, and an invented id can't pass. The agent reads before it acts almost always, so the cost is a read when the person pastes an activity's URL.

Rejected: replacing `MOODLE_MCP_SITES` (a site is where the person logs in, with its profile; classrooms sit on top), checking `courseId` only (ids are site-wide), looking up each id's course in Moodle (a driver change and a call per id, for the same result), limiting by course names (ambiguous across years and sites).

## Consequences

- Each tool's outputs say which of their ids are of which kind, and each tool's inputs which kind they take; a test fails on an id input no tool's output can give.
- The seen ids live in the server's memory: a new session reads again.
- With classrooms, the browser tools and messaging users are off; without them, nothing changes.
