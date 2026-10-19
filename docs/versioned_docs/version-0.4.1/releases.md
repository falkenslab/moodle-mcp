---
title: Releases
sidebar_label: Releases
---

# Releases

moodle-mcp is on npm as [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp). With `npx -y @falkenslab/moodle-mcp`, your AI app starts the latest version each time. To stay on one version, write it after the name: `npx -y @falkenslab/moodle-mcp@0.4.1`.

Each release's documentation is kept: pick it in the version menu at the top of the page. The full notes are on [GitHub](https://github.com/falkenslab/moodle-mcp/releases).

## 0.4.1 (19 October 2026)

- **Installs through agent-kit again.** 0.4.0 listed two packages it already carries inside as dependencies, so agent-kit refused it (and npx downloaded them for nothing).
- **Backups on your computer.** `read_backup` tells what a `.mbz` holds without restoring it, including what a restore elsewhere would leave broken and what still names someone; `anonymize_backup` writes a copy that names no one and no site, for sharing a unit.

## 0.4.0 (18 October 2026)

- **About 120 more tools**, 233 by default. For building courses: books' chapters, lessons' pages and jumps, wikis, glossaries, databases (fields, templates, presets and entries), feedback questions, rubrics and marking guides, badges, every question type (Cloze, ordering, drag and drop, calculated…) with categories and export. For running them: workshops from submission to grades, choice and survey results, quiz statistics, course completion, grades imported from CSV, scales and grade letters, groups made at once.
- **Advanced tools, on request.** Course blocks, the content bank, BigBlueButton, competencies, notes about participants and external tools (LTI): 30 more tools, off unless you set `MOODLE_MCP_ADVANCED=true`, so every chat doesn't pay for them. See [Limiting the agent](./limits.md#advanced-tools).
- **Moodle 4.5 too.** It works on Moodle 4.5, the long-term support release, as well as 5.x, with the Boost and Classic themes. What a site's Moodle lacks (the activities overview on 4.5) is refused with a clear message.
- **Check before uploading.** `validate_gift` checks GIFT questions and `validate_html` checks HTML before they reach Moodle.
- **Codex plugins.** Settings an app leaves as `${…}` placeholders count as not set, so the plugins work in Codex too; without a site, the agent asks you for it.
- A SCORM's package can be replaced in place, and the people in every new tool reach the AI as aliases, as before.
- With moodle-driver 0.10.

## 0.3.0 (14 October 2026)

- **Several Moodle sites in one server.** Give it your school's and your university's sites in `MOODLE_MCP_SITES`, or add one while you talk (`add_site`); the agent works on one at a time and switches when you ask (`list_sites`, `use_site`, `remove_site`). Each site keeps its own login. `MOODLE_URL` works as before, as the first site. See [Several sites](./several-sites.md).
- **Copy course content between sites.** `copy_between_sites` copies activities, sections or a whole course from one site to another, through Moodle's own backup and restore, without people's data and without passing through the AI, and tells you what it created and what's left to fix.
- **Back up and restore part of a course.** `backup_course` takes the sections or activities to keep, without people's data; `restore_course` puts them in a chosen section and says what it created and what it left broken.
- **Eight more long lists a page at a time**: conversations, discussions and their posts, submissions, participants, quiz results and question banks.
- **Read-only access keeps `download_file` and `export_grades`**, which only read Moodle and save a file on your computer.
- **`MOODLE_URL` may be any page of your site**, such as a course's address, as the docs said.
- With moodle-driver 0.8, which also starts quizzes with a time limit.

## 0.2.0 (12 October 2026)

- **Long lists a page at a time.** Notifications come 30 at a time and course logs 50 at a time, and the agent asks for more when it needs them, so a busy account no longer floods the AI with tens of thousands of characters. Log entries are shorter too: Moodle's long description of each one only when asked.
- **Reading submissions changes nothing.** Reading an assignment's submissions no longer creates empty ones in Moodle. It still shows in Moodle's logs as you viewing the grading pages, as with Moodle's own grader.
- **Clearer for the agent.** Every submission status is explained (such as `new`: started, nothing in it yet), and course progress and activity completion are said to come only for students, in courses that track them.
- With moodle-driver 0.7.

## 0.1.0 (12 October 2026)

The first release.

- 137 tools over Moodle: courses and content, the course life cycle (copy, back up, restore, import, reset), assignments and grading (rubrics, marking workflow, extensions), quizzes and question banks, the gradebook, participants, groups and enrolments, reports and logs, forums, workshops, messages, the calendar, and activities as a student (quizzes, assignments, surveys, choices, lessons, H5P, SCORM).
- You log in yourself, in a browser window it opens. It never sees your password.
- Students reach the AI as aliases by default. `block` keeps their data away altogether, and `clear` shows names, for a model on your own computer.
- Limits only you can loosen: a role, read-only access and scopes.
- Browser tools for what no other tool covers, such as a plugin or a SCORM package's content.

Tested against Moodle 5.x.
