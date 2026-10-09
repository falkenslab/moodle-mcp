# Architecture

## Flow

```
MCP client --stdio--> server.ts -> createServer.ts (McpServer + instructions) -> tools/<tool>.ts -> browser.ts (persistent context, system channel) -> Moodle pages
                         ^
                     config.ts (arguments + environment variables, then the configure tool)
```

## Key pieces (`src/`)

- `server.ts` — the entry point (the bundle's): reads the configuration, connects stdio, closes the browser when the client leaves (stdin closed or a signal).
- `createServer.ts` — the `McpServer` with its `instructions` and tools, apart from the entry point so tests drive it through an in-memory transport.
- `config.ts` — `loadConfig(argv, env)`: the starting `Config`, all optional (arguments win over environment variables; an invalid value stops the server with a message on stderr). One `Config` object is shared by the tools and the browser, and `configure` changes it in place (ADR-009); `requireSiteUrl()` throws `NotConfiguredError`.
- `browser.ts` — `createBrowserManager()`: opens the persistent Playwright context on the configured profile on first use (Edge, then Chrome, unless a channel is set) and reuses it, one operation at a time; a headed request (login) relaunches it with a window; a closed window means a new launch on the next call. With no system browser, it starts the Chromium download in the background and answers `BrowserDownloadingError` until it ends (ADR-001).
- `chromiumInstaller.ts` — `installChromium()`: `playwright-core`'s CLI from `node_modules`, its output on stderr.
- `sessionCookies.ts` — the session cookies Chromium drops on close, saved in the profile and restored on launch (ADR-007).
- `moodle/session.ts` — whether a page has a real user logged in (`notloggedin` body class, `M.cfg.userId`, login and logout links to tell a guest; never visible texts), `openSitePage()` for tools (throws `NotLoggedInError`, which names `login`).
- `moodle/ajax.ts` — `callService()`: one of Moodle's AJAX services, called from a kept logged-in tab with its `sesskey` (ADR-008); a stale tab is replaced, a session error becomes `NotLoggedInError`; `readPageConfig()` reads that tab's `M.cfg` (user id, language, time zone).
- `instructions.ts` — the server's usage rules for any client.
- `moodle/site.ts` — `findMoodleSite()`: a site's base URL from any of its pages, fetched without the browser (`M.cfg.wwwroot`).
- `tools/configure.ts` — `configure`: URL, headless, profile folder, in memory (ADR-009); closes the browser when the profile or the mode changes.
- `tools/login.ts` — `login`: returns the user if the session is alive; else a window at the login page, waiting (with progress notifications) until the person is back on the site logged in.
- `tools/listCourses.ts` — `list_courses`: the person's courses, from `core_course_get_enrolled_courses_by_timeline_classification`.
- `moodle/course.ts` — a course's state (`core_courseformat_get_state`), shared by the course tools, and activity details (dates, restriction texts) from the course page and, for activities it doesn't show, their section pages.
- `tools/getCourseStructure.ts` — `get_course_structure`: sections and activities with visibility, availability, restrictions and completion; dates and restriction texts with `details`.
- `tools/listAssignments.ts` — `list_assignments`: a course's assignments by course module id, from the course state.
- `moodle/assign.ts` — an assignment's instance and context ids from its grader page (cached in memory; no service gives them), participants and their dates through `mod_assign_list_participants` and `mod_assign_get_participant`, and a submission's content from the grader panel fragment (`core_get_fragment`), read by class in a blank tab.
- `tools/getSubmissions.ts` — `get_submissions`: every participant's status, dates and, by default, content.
- `tools/gradeSubmission.ts` — `grade_submission`: the grading panel's form filled in a blank tab, serialized as the grader does and sent to `mod_assign_submit_grading_form`; the saved grade and feedback read back.
- `moodle/user.ts` — a user by id, the site's name, a user's roles in a course (role links on their course profile) and what they can do there, asked of read-only services that need the capability (activity types they can add, the grader report).
- `tools/getMe.ts` — `get_me`: who the person is and, for a course, their roles and whether they can edit and grade.
- `moodle/forum.ts` — a forum's discussions from its pages (rows read by data attributes, links and timestamps; the body id tells a forum page), a discussion's posts through `mod_forum_get_discussion_posts`, their HTML as text in a blank tab.
- `tools/listDiscussions.ts`, `tools/getDiscussion.ts` — `list_discussions` (replies 0: unanswered) and `get_discussion`.
- `tools/forumPosts.ts` — `reply_to_post` and `create_discussion` through Moodle's post form (`mod/forum/post.php`): subject prefilled for replies, attachments uploaded to its draft area, the forum's instance id from its page's quick-post form; empty messages refused.
- `moodle/grades.ts` — the user grade report's rows (cell and row classes; action menus left out).
- `tools/getMyGrades.ts`, `tools/listPending.ts` — `get_my_grades`, and `list_pending`: tracked activities not complete, or ungraded ones where completion isn't tracked, with dates and restrictions.
- `moodle/editor.ts` — the course editor's actions through `core_courseformat_update_course`, renames through `core_update_inplace_editable`, the course format from the course page's body class.
- `tools/courseLayout.ts` — `edit_activity`, `duplicate_activity`, `delete_activity`, `add_section`, `edit_section`, `delete_section`: each returns the course structure after the change.
- `moodle/forms.ts` — Moodle forms in the browser: fields set by name (TinyMCE editors through their API), local files uploaded to a draft area as the file picker does, submit, validation errors by field (`#id_error_<field>`).
- `tools/activityForms.ts` — `create_activity` (any type, hidden by default) and `update_activity`, through `course/modedit.php`; any setting by its form field name.
- `moodle/inPage.ts` — `inPage()`: page code with helper functions, safe under tsx's keepNames.
- `moodle/quiz.ts` — a quiz's page (rules, dates, attempt cards), an attempt's questions on every page (fields by form name, options with their labels), answers saved page by page, the finish form submitted directly, the review.
- `tools/quizAttempts.ts` — `get_quiz_info`, `start_quiz_attempt`, `get_quiz_attempt`, `answer_quiz_questions`, `finish_quiz_attempt`, `get_attempt_review`.
- `moodle/text.ts` — `decodeEntities()`: names Moodle formatted for HTML, as plain text; `readTexts()`: elements' text in a page, paragraphs and lists kept.
- `moodle/pace.ts` — reading at a person's pace for the realistic trail (ADR-012): bounded pauses with progress.
- `tools/getActivityContent.ts` — `get_activity_content`: a page, book, label, URL, file or folder viewed as a person would (`forceview` for URLs and files), so Moodle logs the view; books chapter by chapter or from the print page, by trail.
- `tools/index.ts` — the list of tools; `tools/<tool>.ts` — one tool each: its schemas, annotations and handler, receiving a `ToolContext` (`config`, `browser`).
- `version.ts` — the package name and version, from `package.json` (inlined by esbuild).

## Folder map

- `src/` — the server.
- `test/` — `node:test` suites mirroring `src/`.
- `scripts/` — build helpers (esbuild).
- `dist/server.mjs` — the bundle and the package's bin (not committed).
- `.minispec/` — this specification; `.claude/skills/` — skills for developing this repo.
