# Tool catalog
Candidate domain tools for moodle-mcp, by use case, for teachers and students. It's a roadmap, not a commitment: each tool gets its own MiniSpec feature when its turn comes. Since 9 October 2026 the Moodle work behind each tool (the "How" column) is moodle-driver's, with its own feature cards; this server's `driver-tools` card tracks which tools expose them, while there are areas left (every area of moodle-driver 0.3 is exposed since 11 October 2026).

## Sources

- **Teacher runs.** 2 miyagi (teacher-agent) workspaces in `../moodle-courses`, 25 sessions on the local sandbox (Moodle 5.x): 1,037 tool calls, 755 of them generic Playwright calls.
- **Student runs.** 6 padawan (student-agent) workspaces, 79 sessions, mostly on Campus Aulatic (Moodle 4.5, Spanish, CAS single sign-on): 4,255 Playwright calls, about 30 quiz attempts, 12 forum posts, 5 questionnaires, 1 assignment.
- **Moodle 5.2 services.** 755 web service functions, 425 of them callable through AJAX (`'ajax' => true`), plus `core_get_fragment` callbacks, dynamic tables and dynamic forms.

Evidence is noted as **T** (teacher runs) or **S** (student runs) with what was observed; "none" means no run needed it yet.

## How tools are built

- **AJAX** — a Moodle AJAX service from the kept logged-in tab (ADR-008). Fast, structured, language-independent.
- **Fragment** — `core_get_fragment` HTML (or a dynamic table), read by class.
- **Page** — a Moodle page read by its structure (ids, classes, data attributes, URLs), never by visible texts.
- **Form** — a Moodle form page filled and submitted in the browser (settings, files, attempts).

Most course editing, assignment grading, forum posts, messaging, calendar and completion toggles have AJAX services. Activity content (pages, books, resources), quiz attempts and reports, gradebook reports, participants' roles, full activity settings and file uploads don't: those are pages or forms.

## Findings that shape every tool

- **Login cost every session.** 4–8 calls each time in teacher runs; 57 manual logins (CAS) in student runs; expiry in the middle of a quiz. Covered by `login` and the saved session (ADR-002, ADR-007).
- **Output size.** Course pages in edit mode, quiz pages and PDFs overflowed the model's limit at least five times. Tools return compact JSON and paginate.
- **Writes need a person's consent.** Teachers approved before publishing (4 approvals), and one resource went visible before approval. Students had 7 forum drafts rejected. Write tools create hidden by default where Moodle allows, say exactly what they'll change, and verify after.
- **Students leave a trail.** padawan's rules ask for real page visits at a human pace, not direct file URLs or services. Student tools that "view" or "do" something follow the `trail` setting (ADR-012): `realistic` by default, through the real pages, so Moodle logs the view and completion as for a person; `fast` where a client only wants the content.
- **Fragile UI parts.** The activity chooser, the question type chooser, TinyMCE, the file picker and H5P iframes cost most retries. Tools go around them (direct form URLs, setting editor fields, draft area uploads).

## Session and identity

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `configure` | Site URL, headless mode, profile, at run time | W (server only) | — | — | Done |
| `login` | Make sure there's a session; manual login, SSO included | W (session) | Page | T 23 logins; S 57 manual logins, CAS, expiry | Done |
| `server_info` | Effective configuration | R | — | — | Done |
| `get_me` | Who am I: user id, full name, email, language, time zone; with `courseId`, my roles there and what I can do (edit, grade) | R | AJAX (`M.cfg`, `core_user_get_users_by_field`, `core_courseformat_get_section_content_items`, `gradereport_grader_get_users_in_report`) + Page (`/user/view.php?id=&course=` for the roles) | S "which email will the certificate go to"; T telling students from teachers | Done |
| `get_site_info` | Site name, Moodle version, language, installed activity and question types | R | AJAX (`tool_mobile_get_public_config`, `core_courseformat_get_section_content_items`) + Page | T listed 19 activity types and 17 question types by hand; tried to switch the language | Done (no version: Moodle shows it to administrators only; question types come with the question bank) |
| `logout` | End the session, to switch accounts (teacher/student in the sandbox) | W | Page | none | Done |

## Courses and navigation (both roles)

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `list_courses` | My courses, by dates | R | AJAX | T, S every session | Done |
| `get_course_structure` | Sections and activities with ids, type, visibility, restrictions, dates, my completion state | R | AJAX (`core_courseformat_get_state`) | T 110 course page loads; S 105 course + 101 section pages, 310 text searches for completion words | Done |
| `list_assignments` | A course's assignments | R | AJAX | T | Done |
| `get_activity_settings` | One activity's settings and description: dates, max grade, completion rules, attached files | R | Page (`view.php`, `modedit.php` for teachers) | T 16 edits started from `modedit.php?update=` | Done |
| `get_activities_overview` | Per type, the course's activities with due dates, submissions and what needs grading | R | AJAX (`core_courseformat_get_overview_information`, 5.x) | T "are there submissions pending to grade?" | Done |
| `list_deadlines` | Upcoming due dates in one course or all | R | AJAX (`core_calendar_get_action_events_by_timesort`) | S deadlines read off course pages | Done (action events: what the person has to do) |
| `get_course_updates` | What changed in a course since a date | R | AJAX (`core_course_get_updates_since`) | none; useful at session start | Done |
| `list_notifications` | My notifications | R | AJAX (`message_popup_get_popup_notifications`) | S forum reply notifications | Done |
| `mark_notifications_read` | Mark them read | W | AJAX | S | Done |
| `list_conversations` | My message conversations | R | AJAX (`core_message_get_conversations`) | none | Done |
| `get_conversation` | Messages of one conversation | R | AJAX | none | Done |
| `send_message` | Message a user | W | AJAX (`core_message_send_instant_messages`) | none | Done |

## Student: content and progress

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `get_activity_content` | Read a page, label, book (all chapters or one), URL resource or HTML package as text; logs the view | R | Page | S 621 page loads, 34 book chapters, 43 HTML package pages, 84 tab switches | Done |
| `download_resource` | Save a course file (PDF, docx…) locally, through the session | R | Page (`resource/view.php?redirect=0`, then `pluginfile.php`) | S files saved 2–5 times, `.bin` names, base64 overflows | Done as `download_file` |
| `get_activity_media` | Videos in an activity: source, duration, host | R | Page | S 400 video polling calls, 60 calls to find sources | Done as `get_activity_content`'s `media` |
| `watch_video` | Play a video to the end at real speed, for completion | W (trail) | Page | S two courses depend on watched videos; one run took 29 h | Out of scope (owner, 9 October 2026): the agent gets the media's URL or file |
| `download_media` | Save a video locally for transcription | R | Page | S 95 transcription runs | Done via `download_file` (same host) or the media's URL |
| `get_my_grades` | My grades, ranges and feedback in a course | R | Page (`/grade/report/user/index.php`) | S 9 sessions on progress and grades | Done |
| `list_pending` | What I still have to do: incomplete activities, restrictions, due dates | R | AJAX (`get_state`) + `get_my_grades` | S "what activities do I have left?"; the teacher-only progress report gave 404 | Done |
| `set_completion` | Mark an activity done or not done (manual completion) | W | AJAX (`core_completion_update_activity_completion_status_manually`) | none | Done |

## Student: doing activities

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `get_quiz_info` | Attempts allowed and used, grading method, pass mark, time limit, dates, past attempts | R | Page | S about 30 attempts, 2nd attempts below 8/10 | Done |
| `start_quiz_attempt` | Start or continue an attempt; questions with type, text, images, options | W | Form | S 683 attempt page loads | Done |
| `answer_quiz_questions` | Save answers to questions of an attempt | W | Form | S one click per option, repeated clicks | Done |
| `get_attempt_summary` | Which questions are answered before finishing | R | Page | S 86 summary pages | Done as `get_quiz_attempt` |
| `finish_quiz_attempt` | Submit the attempt (asks for consent) | W | Form | S approval before each submit | Done |
| `get_attempt_review` | Grade, per-question correctness and feedback | R | Page | S 45 review pages | Done |
| `get_assignment` | Brief, attached files, dates, submission types, my status, grade, feedback | R | Page + AJAX (`mod_assign_get_participant`) | S final task brief and template | Done |
| `save_submission` | Save online text and files as a draft | W | Form (draft area upload) | S 1 PDF submission | Done |
| `submit_assignment` | Submit for grading, accepting the statement | W | Form | S 1 | Done |
| `list_forums` | A course's forums | R | AJAX (`get_state`) | S, T | Done via `get_course_structure` (type `forum`) |
| `list_discussions` | A forum's discussions: author role, replies, last post, unanswered | R | Page (`forum/view.php`) | S 95 forum pages; T "check the questions forum" | Done |
| `get_discussion` | A discussion's posts as text, with attachments | R | AJAX (`mod_forum_get_discussion_posts`) | S, T | Done |
| `reply_to_post` | Reply in a discussion | W | AJAX (`mod_forum_add_discussion_post`); Form when attaching files | S 12 posts after approval, 7 drafts rejected | Done |
| `create_discussion` | Start a discussion, with attachments | W | Form (`post.php`) | S help request with a screenshot | Done |
| `get_questionnaire` | A survey's questions (mod_questionnaire, mod_feedback) | R | Page | S end-of-course survey in every course, 29 questions | Done as `get_survey` |
| `submit_questionnaire` | Answer and submit it, retrying server errors and checking it was recorded | W | Form | S 19–38 selects per run, 502 errors four times | Done as `submit_survey` (a 5xx isn't retried: it says to check with `get_survey`) |
| `get_choice` | A choice's options, whether it's open, the person's answer | R | Page | none | Done |
| `answer_choice` | Answer a choice activity | W | Form | none | Done |
| `get_lesson_page` | Current page of a lesson | R | Page | S lesson gating an escape room | Done |
| `answer_lesson_page` | Answer it and move on | W | Form | S | Done |
| `get_h5p_activity` | H5P content type, attempts, score | R | Page | S 93 H5P pages; solving stays in the browser | Done |
| `get_scorm` | A SCORM's attempts, grade, and its SCOs' status and score | R | Page (`view.php`, `prereqs.php`) | Sandbox, 11 Oct 2026 | Done |
| `open_scorm` | Enter the player (continue or new attempt) for the browser tools to do the package in its frame | W | Page (`player.php`) | Sandbox: a custom SCORM 1.2 done and graded | Done |

## Teacher: building the course

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `update_course` | Course full name, short name, summary | W | Form (`course/edit.php`) | T renamed with approval | Done |
| `add_section` | Add a section with name and summary | W | AJAX (`core_courseformat_update_course` `section_add`) + `update_section` | T 3 sections added | Done |
| `update_section` | Rename, summary, visibility | W | AJAX (`core_update_inplace_editable`, `section_hide`/`show`) + Form (`editsection.php`) for the summary | T 12 renames, 25–35 s each | Done as `edit_section` |
| `move_section` | Reorder sections | W | AJAX (`section_move_after`) | none | Done as `edit_section` |
| `delete_section` | Delete a section | W | AJAX (`section_delete`) | none | Done |
| `create_module` | Create an activity or resource of any type in a section, hidden by default: name, description, content, files, display and completion settings | W | Form (`course/modedit.php?add=`) | T 10 pages, 4 labels, 2 files, 1 quiz; the activity chooser failed in both workspaces | Done as `create_activity` |
| `create_page` | Page with rich HTML and embedded images | W | Form, via `create_module` | T TinyMCE written by script 17 times; 5 images through the image dialog | Done via `create_activity` |
| `create_label` | Text and media block | W | Form, via `create_module` | T | Done via `create_activity` |
| `create_file_resource` | File resource from a local file | W | Form + draft area upload | T PDF and HTML game uploads | Done via `create_activity` |
| `create_url_resource` | Link to an external page, with display mode | W | Form | none | Done via `create_activity` |
| `create_folder` | Folder with several files | W | Form | none | Done via `create_activity` |
| `create_assignment` | Assignment with dates, submission types and grading | W | Form | none (assignments existed) | Done via `create_activity` |
| `create_quiz` | Quiz shell with timing, attempts, grading | W | Form | T 1 quiz shell | Done via `create_activity` |
| `create_forum` | Forum of a given type | W | Form | none | Done via `create_activity` |
| `update_module` | Change an activity's settings or content | W | Form (`modedit.php?update=`) | T 16 edits: renames, rewritten pages and labels | Done as `update_activity` |
| `rename_module` | Rename only | W | AJAX (`core_update_inplace_editable` `activityname`) | T 5 renames | Done as `edit_activity` |
| `set_module_visibility` | Show, hide, or make available but not shown | W | AJAX (`cm_show`, `cm_hide`, `cm_stealth`) | T publishing after approval, hidden drafts | Done as `edit_activity` |
| `move_module` | Move to another section or position | W | AJAX (`cm_move`) | T quiz moved after new pages, verified by screenshot | Done as `edit_activity` |
| `duplicate_module` | Duplicate an activity | W | AJAX (`cm_duplicate`) | none | Done as `duplicate_activity` |
| `delete_module` | Delete an activity | W | AJAX (`cm_delete`) | T 1 page deleted | Done as `delete_activity` |
| `upload_files` | Upload local files to a draft area for a form (used by the tools above) | W | Page (`repository/repository_ajax.php`) | T file picker took 8 calls and a wrong first try | Done inside `create_activity` |
| `get_module_file` | Download a file stored in an activity | R | Page (`pluginfile.php`) | T PDF opened to capture slides | Done via `download_file` |
| Book chapters | List, add, edit, move, show or hide, delete a book's chapters (`list_book_chapters`…) | R/W | Pages and forms (`mod/book/edit.php`) | #18; sandbox, 17 Oct 2026 | Done |
| Lesson pages | A lesson's pages, answers and jumps, as its editor has them (`get_lesson_pages`…) | R/W | Lesson editor forms | #19; sandbox, a branching lesson built | Done |
| Database fields and templates | Fields, templates and presets of a database activity (`get_database_fields`…) | R/W | Pages and forms (`mod/data/field.php`, `templates.php`, `preset.php`) | #20; sandbox | Done |
| Badges | List, create, set criteria, enable and award course badges (`list_badges`…) | R/W | Pages, forms and `core_badges_enable_badges` | #21; sandbox, one badge in course 3 | Done |
| Glossaries | Entries (read, add, edit, delete, approve), categories, XML export and import | R/W | Pages and forms | #26; sandbox, teacher and student entries | Done |
| Database entries | Read, add, edit, delete, approve, CSV export and import | R/W | Pages and forms | #27; sandbox | Done |
| Course completion | Its criteria, each participant's status, marked by hand | R/W | Settings form, `report/completion` | #31; sandbox, course 3 put back | Done |
| Choice and survey results | Who chose what; feedback and questionnaire responses | R | Report pages | #28; sandbox | Done |
| Question categories | Categories, moving questions, GIFT and XML export; every question type | R/W | Bank pages and forms | #30, #43; sandbox, seven types | Done |
| Wikis | A subwiki's pages, a page with its history, created and edited (a section too) | R/W | Pages and the editor | #32; sandbox, teacher and student | Done |
| Feedback questions | A feedback's items and templates | R/W | Its questions page, export and forms | #35; sandbox, every kind and a dependency | Done |
| Advanced (ADR-022) | Course blocks, the content bank, BigBlueButton, notes, competencies, external tools (LTI): 30 tools off by default | R/W | Pages, forms and services | #37–#42; sandbox, but uploading H5P and rating competencies (no package, no framework there) | Done |
| `read_backup`, `anonymize_backup` | What a .mbz holds and leaves broken, and an anonymous copy, without Moodle | R/W (local) | `backupContents`, `anonymizeBackup` | Sandbox, a partial backup of course 3 | Done |
| SCORM package | Replace a SCORM's package in place | W | Form (`update_activity`'s `package`) | #23; sandbox | Done |

## Teacher: assignments and grading

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `get_submissions` | Participants' status, dates and content of one assignment | R | Fragment + AJAX | T "are there submissions pending?" | Done |
| `get_assignment_settings` | Dates, submission types, grading method, max grade | R | Page | T read descriptions and dates | Done (get_activity_settings) |
| `get_rubric` | Grading method, rubric or marking guide criteria and levels | R | Page (`grade/grading/manage.php`) or Fragment | T rubric read as text: 6 criteria, 4 levels | Done |
| `validate_gift`, `validate_html` | Check GIFT and HTML before sending them, without Moodle (HTML approximately) | R | Local (`gift-pegjs`, `parse5`) | #24; miyagi validated both itself | Done |
| `set_rubric` | Define a rubric or marking guide, refused once used for grading | W | Form (`grade/grading/form/<method>/edit.php`) | #17; sandbox | Done |
| `download_submission_files` | Save a participant's submitted files locally | R | Page (`pluginfile.php`) | none | Done via `download_file` |
| `grade_submission` | Grade (points, scale or rubric levels) with feedback text and files, notifying or not | W | AJAX (`mod_assign_submit_grading_form`, form from the `gradingpanel` fragment) | none yet: no submissions existed; a core need | Done |
| `grant_extension` | Extend the due date for some participants | W | Form (`view.php?action=grantextension`) | none | Done |

## Teacher: quizzes and question banks

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `get_quiz_statistics` | Facility, discrimination and responses per question | R | Page (`report.php?mode=statistics`) | #36; sandbox | Done |
| `get_quiz_results` | Attempts, grades and per-question marks | R | Page (`report.php?mode=overview`) | T quiz overview read | Done |
| `get_quiz_structure` | A quiz's slots, pages and questions | R | Page (`mod/quiz/edit.php`) | T 13 quiz editor loads | Done |
| `list_question_banks` | Banks of a course (per quiz and shared, 5.x) | R | Page (`question/banks.php`) | T bank navigation | Done |
| `list_questions` | Questions in a bank with type and status | R | Fragment (`core_question` `question_data`) | T | Done |
| `import_questions` | Import GIFT or Moodle XML into a bank | W | Form (question import page, with upload) | T quiz left empty after failing the type chooser; GIFT researched | Done |
| `create_question` | One question of a given type | W | Form (`question/bank/editquestion/question.php`) | T failed twice | Done |
| `add_questions_to_quiz` | Add existing or random questions | W | Form (`quiz/edit.php`); AJAX for random (`mod_quiz_add_random_questions`) | T | Done |
| `update_quiz_settings` | Timing, attempts, review options | W | Form (`modedit.php`) | none | Done via `update_activity` |
| `set_quiz_override` | Per-user or group overrides | W | AJAX (`mod_quiz_save_overrides`) | none | Done (users) |

## Teacher: forums and communication

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `list_discussions` (`unansweredOnly`) | Discussions waiting for the teacher | R | Page + AJAX | T "answer the two unanswered threads"; the forum skill depends on it | Done (replies 0) |
| `reply_to_post` | Answer a student | W | AJAX | T asked, never done | Done |
| `post_announcement` | Post in the announcements forum | W | Form (`post.php`) | none | Done as `create_discussion` |
| `set_discussion_state` | Pin, lock | W | AJAX (`mod_forum_set_pin_state`, `set_lock_state`) | none | Done |
| `create_event` | Course calendar event | W | AJAX (`core_calendar_submit_create_update_form`) | none | Done |
| `list_events` | Upcoming calendar events, in a course or all | R | AJAX (`core_calendar_get_calendar_upcoming_view`) | none | Done |
| Grades from CSV, scales, letters | `import_grades` (previewed), `list_scales`, `add_scale`, `edit_scale`, grade letters | R/W | Import, scales and letters pages | #33; sandbox, names in clear | Done |
| Groups made at once | `auto_create_groups` (previewed, its seed kept), `import_groups` | W | Auto-create and import forms | #34; sandbox | Done |
| `delete_event` | Delete a course or user event | W | AJAX (`core_calendar_delete_calendar_events`) | none | Done |
| Workshop end to end | A student's submission, examples, grade calculation and overrides | R/W | Pages and forms | #29; sandbox, submission to override | Done |
| Workshop allocation | Who assesses whom: read, by hand, at random, scheduled (`get_workshop_allocation`…) | R/W | Page and forms (`mod/workshop/allocation.php`) | #22; sandbox without submissions | Done |

## Teacher: participants, progress and gradebook

| Tool | Use case | R/W | How | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `list_participants` | Participants with roles, groups and last access | R | Fragment (participants dynamic table) | T 3 sessions, roles told apart by hand | Done |
| `list_inactive_participants` | Who hasn't accessed since a date | R | Same as above | T last access read from the table | Done (list_participants inactiveSince) |
| `list_groups` | Groups and members | R | AJAX (`core_group_get_course_groups`) + Page | none | Done |
| `get_completion_report` | Activity completion per participant | R | Page (`report/progress/index.php`) | T progress monitoring skill | Done |
| `get_grader_report` | Grade items and every participant's grades | R | Page (`grade/report/grader/index.php`) | T 3 sessions | Done |
| `get_gradebook_setup` | Categories, items, weights, aggregation | R | AJAX (`core_grades_get_grade_tree`) | T read by script to plan weights | Done |
| `update_grade_item` | Category, weight, max grade of an item | W | Form (gradebook setup) | T planned weights, done by hand | Done |
| `add_grade_category` | New gradebook category | W | AJAX (`core_form_dynamic_form` `add_category`) | none | Done |
| `override_completion` | Mark an activity complete for a participant | W | AJAX (`core_completion_override_activity_completion_status`) | none | Done |

## Browser fallback and follow mode (ADR-010, ADR-011)

- **Fallback tools.** Done (ADR-010): `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select`, `browser_upload`, `browser_screenshot`, `browser_wait`, on the session's one working tab, limited to the site, never typing passwords, snapshots of the main region cut at 30,000 characters. For what no domain tool covers: H5P, external escape rooms, a SCORM package's content once `open_scorm` has opened it.
- **Follow mode.** Done as `show_browser` (ADR-011): on the person's request, the browser shows a window and each domain tool brings the Moodle page it's working on to the front; hidden again on request.

## Suggested order

1. **Reading for both roles:** `get_me`, `get_course_structure`, `get_activity_content`, `get_activities_overview`, `list_deadlines`, `list_discussions`, `get_discussion`, `get_my_grades`, `list_pending`.
2. **Teacher writing, where most effort went:** `create_module` and its typed helpers, `upload_files`, `update_module`, `set_module_visibility`, `move_module`, sections; then `grade_submission`, `reply_to_post`, `create_discussion`.
3. **Student doing:** the quiz attempt tools, `save_submission` and `submit_assignment`, `submit_questionnaire`, `watch_video`, `download_resource`.
4. **The rest:** question banks and import, gradebook setup, participants and groups, messaging, calendar, browser fallback.
