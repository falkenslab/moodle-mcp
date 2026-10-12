---
title: Releases
sidebar_label: Releases
---

# Releases

moodle-mcp is on npm as [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp). With `npx -y @falkenslab/moodle-mcp`, your AI app starts the latest version each time. To stay on one version, write it after the name: `npx -y @falkenslab/moodle-mcp@0.1.0`.

Each release's documentation is kept: pick it in the version menu at the top of the page. The full notes are on [GitHub](https://github.com/falkenslab/moodle-mcp/releases).

## 0.1.0 (12 October 2026)

The first release.

- 137 tools over Moodle: courses and content, the course life cycle (copy, back up, restore, import, reset), assignments and grading (rubrics, marking workflow, extensions), quizzes and question banks, the gradebook, participants, groups and enrolments, reports and logs, forums, workshops, messages, the calendar, and activities as a student (quizzes, assignments, surveys, choices, lessons, H5P, SCORM).
- You log in yourself, in a browser window it opens. It never sees your password.
- Students reach the AI as aliases by default. `block` keeps their data away altogether, and `clear` shows names, for a model on your own computer.
- Limits only you can loosen: a role, read-only access and scopes.
- Browser tools for what no other tool covers, such as a plugin or a SCORM package's content.

Tested against Moodle 5.x.
