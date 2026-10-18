# Project

## What

`moodle-mcp` is a generic MCP server that works a Moodle site through a real browser (Playwright), so any MCP client can read and, later, manage a course as the person logged in.

## What it does

- Exposes Moodle as domain tools (`list_courses`, `list_assignments`, `get_submissions`…), never as generic browser actions (ADR-004).
- Works Moodle through `@falkenslab/moodle-driver` (sibling repository, ADR-014): the system's Edge or Chrome, or Chromium downloaded on first use, on a persistent profile where the person logs in by hand.
- Configured at run time by the client with `configure`, or by optional environment variables and arguments (ADR-003, ADR-009); its usage rules travel in the MCP server's `instructions`.
- Ships as one bundled `dist/server.mjs` with a `moodle-mcp` bin, over stdio (ADR-005).

## What it doesn't do

- Watch, play or transcribe media: tools give a video's URL (`get_activity_content`'s `media`) or save the site's files (`download_file`); what to do with them is the client's (decided by the owner, 9 October 2026).

## For whom

- Any MCP client: Claude Code, Claude Desktop, custom agents.
- First consumer: miyagi, a teacher's agent built on `@falkenslab/agent-kit`, through a separate Claude Code plugin that only starts this server and adds skills. This server knows nothing of either.

## Goal

Let an agent work in a Moodle course with the person's own session, through tools that speak Moodle's language, without ever handling the person's password.

## Status

Version 0.x: the server, its configuration, `configure`, `login`, `logout`, `get_me`, `get_site_info`, `list_courses`, `get_course_structure`, `get_activity_content`, `list_assignments`, `get_submissions`, `list_discussions`, `get_discussion`, `get_my_grades`, `list_pending`, `get_activities_overview`, `list_deadlines`, `get_course_updates`, the quiz attempt tools, `get_assignment`, `save_submission`, `submit_assignment`, `download_file`, `get_survey`, `submit_survey`, `get_choice`, `answer_choice`, `get_lesson_page`, `answer_lesson_page`, `get_h5p_activity`, `get_scorm`, `open_scorm`, `set_completion`, `grade_submission`, `list_participants`, `list_groups`, `get_grader_report`, `get_completion_report`, `override_completion`, `get_quiz_results`, `set_quiz_override`, `grant_extension`, `set_discussion_state`, `reply_to_post`, `create_discussion`, `list_notifications`, `mark_notifications_read`, `list_conversations`, `get_conversation`, `send_message`, `create_activity`, `update_activity`, the course layout tools (`edit_activity`, `duplicate_activity`, `delete_activity`, `add_section`, `edit_section`, `delete_section`), `get_activity_settings`, `update_course`, the course life cycle tools (`copy_course`, `backup_course`, `restore_course`, `import_activities`, `reset_course`), groups, groupings, enrolments and enrolment methods, reports (`get_activity_report`, `get_participation_report`, `get_course_logs`), `set_grade`, `export_grades`, the gradebook's items and categories, quiz editing and manual grading, question editing, whole-forum grades, ratings, workshops, `edit_post`, `delete_post`, `set_discussion_subscription`, `message_participants`, `get_event`, `update_event`, the marking workflow, the question bank tools (`list_question_banks`, `list_questions`, `import_questions`, `create_question`), `get_quiz_structure`, `add_questions_to_quiz`, `get_rubric`, `set_rubric`, `validate_gift`, `validate_html`, glossaries, databases' entries, choice and survey results, workshops end to end, course completion, question categories and export, every question type, wikis, grade import, scales and letters, groups made automatically, feedback questions, quiz statistics, books' chapters, lessons' pages, databases' fields and templates, badges, workshop allocation, a SCORM's package, the calendar tools (`list_events`, `create_event`, `delete_event`), the gradebook setup tools (`get_gradebook_setup`, `update_grade_item`, `add_grade_category`), `show_browser`, the browser fallback tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select`, `browser_upload`, `browser_screenshot`, `browser_wait`), `server_info`, and limits the person sets on them (a role, read-only access, scopes and student data, ADR-018, ADR-020, ADR-015 and ADR-016, and the advanced tools off by default, ADR-022, other people as aliases by default, ADR-013) exist; the Moodle tools come one by one (see `features/`).

## Test site

`../moodle-sandbox`: a Moodle in Docker with `sandbox-course` and teacher and student accounts (`npm run info -- --json`). Its credentials are for a person to type in the browser; they never appear in this repo.
