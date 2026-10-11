# ADR-015: Tool scopes set by the person, never widened by the agent

## Decision

The person running the server chooses which kinds of tools exist for the agent, by scope, when the server starts (`MOODLE_MCP_SCOPES`, `--scopes`), by profile or by list: `content` (building and managing the course), `student-data` (reading others' work and data), `grading` (deciding about particular people: grades, extensions, overrides), `communication` (writing to or before others: forum posts, messages), `as-student` (acting as a student) and `browser` (the fallback tools, ADR-010). Profiles: `all` (the default, today's behavior), `teacher` (all but `as-student`), `content` (only `content`), `student` (only `as-student`). Session tools (`configure`, `login`, `logout`, `get_me`, `get_site_info`, `list_courses`, `show_browser`, `server_info`) are always there. `configure` can only narrow the scopes for the session, never add one: widening means restarting with another configuration (decided by the owner, 9 October 2026).

- **Scopes come from data, not from a hand-made list.** Each tool's scope follows from the data categories of the moodle-driver functions it calls, which the driver declares per public function (its `data-categories` card): course content, own data, aggregates, others' personal data, writing about others, communication, and `any` for the generic primitives. A tool on `any` (the browser tools, a tool built on `callService` or forms) is in no restricted profile.
- **Out of scope means absent.** Tools outside the scopes are not registered, or are disabled with `notifications/tools/list_changed` when `configure` narrows; a call that still arrives is refused without touching Moodle. The instructions and `server_info` name the active scopes, so the agent says what it can't do instead of improvising (and never through the browser tools, absent then).
- **Aggregates stay with content.** Counts ("2 of 4 submitted", "2 need grading") in `get_activities_overview` and `get_course_updates` identify no one and help manage the course.
- **Content without others' work.** Under a profile without `student-data`, `delete_activity` and `delete_section` refuse an activity that holds others' work (submissions, posts, attempts or responses, as the activities overview counts them), and `download_file` refuses files of others' areas (`assignsubmission_*`, `mod_forum`, `user`… by the component in the `pluginfile.php` URL).
- ADR-016's student data policy sets how others' data reaches the agent (`block` removes the `student-data` and `grading` scopes); scopes choose the kinds of actions on top of it.

## Motivation

A teacher may want an agent that builds content, activities and rubrics but never reads, grades or answers students: data the model doesn't get can't be mishandled, which is stronger than pseudonymizing it (ADR-013). A single "no student data" switch is too coarse (building forums is content, posting in them is communication; defining a rubric is content, grading with it isn't). Scopes the agent could widen with `configure` would protect nothing, so the person sets them where the agent can't reach (the client's server configuration). moodle-driver will keep growing, half of its pending cards into others' data and mixing categories within one area, so classifying by hand would drift: each function declares its data where it's written.

## Consequences

- Needs moodle-driver's `data-categories` first; until then the scopes aren't implemented (no interim hand-made classification, unless the owner asks for one).
- Every new tool gets its scope from the driver functions it calls; a tool combining categories takes the strictest.
- Reading activities is classified by module: teacher-authored ones (page, book, label, resource…) are content; student-authored ones (glossary, wiki, database, workshop entries, forum posts) are `student-data`.
- Pseudonymous mode (ADR-013) still applies to whatever `student-data` tools are allowed; under `content` it has almost nothing to do.
- Whether a client refreshes its tool list on `list_changed` varies: narrowing at start-up is the reliable path, narrowing later is backed by the refusal.
