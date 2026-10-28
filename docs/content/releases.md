---
title: Releases
sidebar_label: Releases
---

# Releases

moodle-mcp is on npm as [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp). With `npx -y @falkenslab/moodle-mcp`, your AI app starts the latest version each time. To stay on one version, write it after the name: `npx -y @falkenslab/moodle-mcp@0.7.0`.

The site shows the latest release's documentation, and the next one's under *Next* in the version menu at the top of the page. An older release's documentation is in the repository at its tag (`docs/content/` at [v0.3.0](https://github.com/falkenslab/moodle-mcp/tree/v0.3.0/docs/content), for example). The full notes are on [GitHub](https://github.com/falkenslab/moodle-mcp/releases).

## 0.7.0 (28 October 2026)

- **The question before what can't be undone speaks your language.** On a computer set to Spanish, moodle-mcp asks "Borrar la actividad… No se puede deshacer. ¿Seguimos?"; otherwise in English, as before. It follows the computer's language settings (`LANG`, `LC_MESSAGES`, `LC_ALL`), which agent-kit also gives its extensions, and `server_info` says which language it uses.
- **Aliases without a key, if you want.** With pseudonym 0.3, the list of people behind the aliases can be kept as a readable file instead of an encrypted one (`PSEUDONYM_STORAGE=plain`), for a folder your system already protects. Encrypted stays the default, and your aliases don't change. The [privacy page](./privacy.md#plain-storage) explains when it fits.

## 0.6.0 (25 October 2026)

- **H5P activities from a package.** `list_h5p_content_types` says which H5P content types your site can run (and whether you may install more), so the agent knows before it builds a package; `create_activity` creates the H5P activity from it, with its tracking and grading settings.
- **Simpler setup guides**, in plain words: install with the shortest command, then make it yours step by step (teaching or studying, your students' names, read only, this year's courses), with where each app keeps its setup. Commands show in a terminal window, and example requests as you'd type them to the agent.
- **Claude Desktop** shows moodle-mcp's question before what can't be undone, as Claude Code and Codex do.
- With moodle-driver 0.13 and playwright-core 1.64.1.

## 0.5.0 (21 October 2026)

- **Classrooms: only the courses you give it.** `MOODLE_MCP_COURSES` lists your courses' URLs, on one site or several, and the agent works only there: other courses are refused, and so is anything it hasn't read in one of them, since Moodle's ids are unique across a site. Lists across courses show only your classrooms. See [Classrooms](./limits.md#classrooms).
- **What can't be undone asks you.** Before deleting, unenrolling, resetting a course or restoring over one, moodle-mcp asks you itself, in your app, and the AI can't skip the question; you have ten minutes to answer. Claude Code and Codex support it. **In an app that can't ask (no MCP elicitation), these tools are refused**, unless it asks you before every tool and you set `MOODLE_MCP_CONFIRM=client`. See [Confirming what can't be undone](./limits.md#confirming-what-cant-be-undone).
- **Firefox.** `MOODLE_MCP_CHANNEL=firefox` works with Playwright's own Firefox, downloaded the first time.
- **The question types a site offers.** `list_question_types` lists them as the question bank's chooser does, plugins marked, so the agent knows what it can use before building a quiz.
- **New use cases**: a lesson from your notes, the class glossary, an end-of-unit survey, and which quiz questions to fix by their statistics.
- **The site, renewed**, in Falken's Lab's look: setup for agents built on agent-kit, and every setting in short, each value explained.
- With moodle-driver 0.12.

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
