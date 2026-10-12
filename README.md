<div align="center">

<img src="docs/img/logo.svg" alt="moodle-mcp logo: the m of Moodle plugged into a socket" width="112"/>

# moodle-mcp

**Let an AI agent work in your Moodle courses as you, with your own login.**<br/>
Your students stay anonymous to the AI, and you decide what it can do.

[![npm](https://img.shields.io/npm/v/@falkenslab/moodle-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/moodle-mcp)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![Moodle 5.x](https://img.shields.io/badge/Moodle-5.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](LICENSE)

</div>

moodle-mcp is an [MCP](https://modelcontextprotocol.io) server: it gives an AI client (Claude Code, Claude Desktop, or any agent that speaks MCP) tools for Moodle tasks: list what needs grading, read submissions, build a quiz from a question file, answer a forum, check what's due this week. It works through a real browser on your machine, logged in as you, so it can do whatever your account can, on any Moodle site: no web service tokens, no administrator, no plugin to install.

- **You log in yourself**, in a browser window it opens. It never sees or stores your password.
- **Students stay anonymous to the AI by default.** Other people reach it as aliases such as `A-7KQ2XM`, which only you can turn back into names.
- **You decide what it may do**: only building content, also grading, acting as a student… Tools that change Moodle say so, and the agent is told to confirm with you first.

Status: early development (0.x). It has 137 tools ([below](#what-it-can-do)) and is tested against Moodle 5.x.

## What you can ask

As a teacher:

- "Which assignments in Programming 1 still have submissions to grade?"
- "Read the submissions to Task 3 and suggest a grade for each with the rubric; don't save anything yet."
- "Import these GIFT questions into the quiz bank and add them to the unit 2 quiz."
- "Which forum discussions has nobody answered?"
- "Create a hidden page in section 4 with this summary of the lesson and this screenshot." (images and files in a text are uploaded with it)
- "Who hasn't opened the course since Monday?"

As a student:

- "What's due this week across my courses?"
- "Summarize the unit 3 pages for me."
- "What grade did I get in the last quiz, and which questions did I miss?"
- "Do the SCORM activity of unit 2, then tell me the grade Moodle recorded."

Before anything that changes Moodle (a grade, a post, an activity), the agent is told to confirm with you, and your client can ask you to approve each call.

## Requirements

- Node.js 20 or later.
- Microsoft Edge or Google Chrome. Without either, the server downloads Chromium (about 180 MB) the first time it needs a browser.
- An MCP client: [Claude Code](https://claude.com/claude-code), Claude Desktop, or another.

## Installing

It's on npm as [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp): your client runs it with `npx`, nothing to install by hand.

**Claude Code**:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
```

**Claude Desktop**: add it to `claude_desktop_config.json` (Settings → Developer → Edit Config), and restart Claude Desktop:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"],
      "env": { "MOODLE_URL": "https://campus.example.org" }
    }
  }
}
```

Any other client takes the same command and arguments. To run a build of your own instead (see [Developing moodle-mcp](docs/development.md)), use `node` with the path to its `dist/server.mjs`. `MOODLE_URL` can be your site or any page of it; without it, the agent asks you for the site the first time.

## First steps

1. Ask the agent something about your courses, such as "list my Moodle courses".
2. The first time, it has no session: a browser window opens at your site's login page. Log in there as you always do, single sign-on included. The tool waits for you (5 minutes).
3. That's it: the session is kept in a browser profile on your machine (`~/.moodle-mcp/profile`) and lasts until Moodle ends it. When it does, the window opens again.

The profile holds a live Moodle session: treat it like a password, and keep it out of shared folders and repositories.

To watch what the agent does, ask it to "show the browser": a window follows each step in Moodle. Ask it to hide it, or close it, to go back to working in the background.

## Students' privacy

What the AI sees of other people (students, colleagues) is one setting, `MOODLE_MCP_STUDENT_DATA`, which only you set, in your client's configuration. The agent can make it stricter for a session, never looser.

| Level | What the AI gets | When |
| --- | --- | --- |
| `pseudonymize` (default) | Other people as aliases, never their names or Moodle ids; names, emails, phone numbers, DNI/NIE and IBANs in what they wrote replaced | Any model, including cloud ones |
| `block` | No tool that reads other people's data or decides about them: only content, overall figures and your own data | When students' data must not reach the AI at all |
| `clear` | Names as Moodle shows them (never emails or profile fields) | Only with a model that runs on your machine |

### Aliases

Each person gets the same alias in every course and every session, so the agent can say "A-7KQ2XM hasn't submitted" and your notes stay valid. To see who it is, in your own terminal:

```bash
npx @falkenslab/pseudonym whois A-7KQ2XM
npx @falkenslab/pseudonym reveal notes.md   # a whole text, such as notes the agent wrote for you
```

Aliases come from a secret key kept on your machine with a directory of the people met (`%APPDATA%\pseudonym` on Windows, `~/.config/pseudonym` elsewhere), never sent anywhere:

- **Back up the key** with `npx @falkenslab/pseudonym key export`: if it's lost, every alias changes and your notes no longer match anyone.
- **Keep the agent away from it.** In your client's permissions, deny reading that folder and running the `pseudonym` command, or the agent could look aliases up. In Claude Code, in your settings' `permissions.deny`: `"Read(~/.config/pseudonym/**)"` (or `"Read(~/AppData/Roaming/pseudonym/**)"` on Windows), `"Bash(pseudonym:*)"` and `"Bash(npx @falkenslab/pseudonym:*)"`.

What to know about `pseudonymize`:

- It applies to every tool, errors included: besides what each tool does, everything a tool returns goes through the same redaction on its way to the AI, and user ids in text are hidden.
- It's pseudonymization, not anonymity: what people write about themselves can still identify them. Street addresses, dates of birth and the names of people the server hasn't met yet aren't detected in free text.
- Text the agent writes to Moodle (feedback, posts, messages) is refused if it contains an alias, since students would read it as is: the agent addresses the student as "you" instead.
- Files other people submitted, a grades export, a course backup with its users (unless Moodle anonymizes them) and screenshots need `clear`: their content can't be pseudonymized. Course logs never include IP addresses.
- Going from `clear` back to `pseudonymize` doesn't remove names the AI already saw, which may remain in your client's memory or history. Use `clear` only in a client configuration with its own memory, never shared with a cloud model.

## Limiting what the agent can do

Three settings choose the tools the agent gets, and like the student data level only you widen them: the agent can narrow them for a session, never the other way.

**Your role** (`MOODLE_MCP_ROLE`) keeps only the tools for what you do in Moodle. Fewer tools also means less of every request spent on them, and an agent that picks better:

| Role | Tools | About |
| --- | --- | --- |
| `all` (default) | 137 | 34,500 tokens |
| `teacher` | 121: building and managing courses, grading, people, reports, forums and messages | 31,000 tokens |
| `student` | 61: reading courses, doing activities, your grades and to-dos, forums and messages | 12,500 tokens |

Counted as the tools' names, descriptions and inputs with students as aliases; clients that also send the tools' output schemas use about twice as much. Claude Code loads many tools only as it needs them; other clients load them all.

**Read only** (`MOODLE_MCP_ACCESS=read`) keeps only the tools that change nothing in Moodle: an assistant that reads courses, submissions, grades and reports but can't grade, post or edit. With `all` it leaves 54 tools (about 9,800 tokens), with `teacher` 49 (8,900), with `student` 35 (6,400). Tools that look like reads but start something (a lesson, a quiz or SCORM attempt) stay out.

**Scopes** (`MOODLE_MCP_SCOPES`) choose by the data a tool touches. With a role, they narrow it further: `teacher` with `content`, 66 tools (17,000 tokens), builds and manages courses and never sees students' work.

| Profile | For |
| --- | --- |
| `all` (default) | Everything, including the browser fallback tools |
| `teacher` | Content, students' work, grading, forums and messages |
| `student` | Reading courses, doing activities, your own grades, forums and messages |
| `content` | Building and managing courses only: activities, sections, question banks, rubrics, calendar, gradebook setup, groups, copies and backups without users. Never reads students' work, grades or writes to students |

Or a list of scopes: `content`, `student-data`, `grading`, `communication`, `as-student`, `browser`, such as `content,communication`. Ask the agent for its `server_info` to see the limits in force.

## What it can do

| Area | Tools |
| --- | --- |
| Session | `login`, `logout`, `get_me`, `get_site_info`, `configure`, `show_browser`, `server_info` |
| Courses and content | `list_courses`, `get_course_structure`, `get_activity_content`, `get_activity_settings`, `download_file`, `create_activity`, `update_activity`, `edit_activity`, `duplicate_activity`, `delete_activity`, `add_section`, `edit_section`, `delete_section`, `update_course` |
| Course life cycle | `copy_course`, `backup_course`, `restore_course`, `import_activities`, `reset_course` |
| Assignments and grading | `list_assignments`, `get_submissions`, `get_rubric`, `grade_submission`, `grant_extension`, `set_workflow_state`, `allocate_marker` |
| Quizzes and questions | `list_question_banks`, `list_questions`, `import_questions`, `create_question`, `update_question`, `delete_questions`, `set_question_status`, `get_quiz_structure`, `add_questions_to_quiz`, `edit_quiz_slot`, `remove_quiz_slot`, `set_quiz_pages`, `add_quiz_section`, `get_quiz_results`, `set_quiz_override`, `list_questions_to_grade`, `grade_quiz_question` |
| Gradebook and progress | `get_grader_report`, `set_grade`, `export_grades`, `get_gradebook_setup`, `add_grade_item`, `update_grade_item`, `delete_grade_item`, `add_grade_category`, `update_grade_category`, `delete_grade_category`, `get_completion_report`, `override_completion` |
| Reports | `get_activity_report`, `get_participation_report`, `get_course_logs` |
| Participants and groups | `list_participants`, `list_potential_users`, `enrol_users`, `unenrol_user`, `set_user_roles`, `list_enrolment_methods`, `set_enrolment_method`, `list_groups`, `create_group`, `update_group`, `delete_group`, `set_group_members`, `list_groupings`, `create_grouping`, `delete_grouping`, `set_grouping_groups` |
| Forums, workshops and messages | `list_discussions`, `get_discussion`, `reply_to_post`, `create_discussion`, `edit_post`, `delete_post`, `set_discussion_state`, `set_discussion_subscription`, `get_forum_grades`, `grade_forum_user`, `rate`, `get_workshop`, `set_workshop_phase`, `assess_workshop_submission`, `list_notifications`, `mark_notifications_read`, `list_conversations`, `get_conversation`, `send_message`, `message_participants` |
| Calendar and to-dos | `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `list_deadlines`, `list_pending`, `get_activities_overview`, `get_course_updates` |
| As a student | `get_my_grades`, `get_assignment`, `save_submission`, `submit_assignment`, `get_quiz_info`, `start_quiz_attempt`, `get_quiz_attempt`, `answer_quiz_questions`, `finish_quiz_attempt`, `get_attempt_review`, `get_survey`, `submit_survey`, `get_choice`, `answer_choice`, `get_lesson_page`, `answer_lesson_page`, `get_h5p_activity`, `get_scorm`, `open_scorm`, `set_completion` |
| Browser fallback | `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select`, `browser_upload`, `browser_screenshot`, `browser_wait` |

The browser fallback tools are for what no other tool covers (a plugin, a rare setting, the inside of a SCORM package that `open_scorm` opened): the agent uses them on your site only, never types passwords, and tells you which task needed them. With `pseudonymize` they never open pages about people (participants, grades, reports, forums, messages), and people on other pages reach the AI as aliases.

Activities done as a student go at a reader's pace by default, so Moodle records views and completion as for a person; `MOODLE_MCP_TRAIL=fast` skips the pauses.

## Settings

Nothing is required: without a site, the agent asks you for it and sets it with `configure` for the session. Environment variables or arguments give starting values (the argument wins).

| Variable | Argument | Default | Meaning |
| --- | --- | --- | --- |
| `MOODLE_URL` | `--url` | none | Your Moodle site, e.g. `https://campus.example.org` |
| `MOODLE_MCP_STUDENT_DATA` | `--student-data` | `pseudonymize` | What the AI sees of other people: `block`, `pseudonymize` or `clear` ([above](#students-privacy)) |
| `MOODLE_MCP_ROLE` | `--role` | `all` | The tools for a role: `teacher`, `student` or `all` ([above](#limiting-what-the-agent-can-do)) |
| `MOODLE_MCP_ACCESS` | `--access` | `write` | `read`: only the tools that change nothing in Moodle ([above](#limiting-what-the-agent-can-do)) |
| `MOODLE_MCP_SCOPES` | `--scopes` | `all` | The kinds of tools: a profile or a list of scopes ([above](#limiting-what-the-agent-can-do)) |
| `MOODLE_MCP_PROFILE_DIR` | `--profile-dir` | `~/.moodle-mcp/profile` | Browser profile folder that keeps your session |
| `MOODLE_MCP_CHANNEL` | `--channel` | Edge, then Chrome, then Chromium | Browser: `msedge`, `chrome` or `chromium` |
| `MOODLE_MCP_HEADLESS` | `--headless` / `--headed` | `true` | Work without a window (logging in always shows one) |
| `MOODLE_MCP_DOWNLOAD_BROWSER` | `--no-download-browser` | `true` | Download Chromium when there's no Edge or Chrome |
| `MOODLE_MCP_TRAIL` | `--trail` | `realistic` | Activities as a student: `realistic` (real pages, human pace) or `fast` |

To share the session with [moodle-driver](https://github.com/falkenslab/moodle-driver)'s `moodle` command line, so you log in once for both, point `MOODLE_MCP_PROFILE_DIR` at its profile for your site: `~/.moodle-driver/sites/<host>/profiles/<account>`. A profile is open in one browser at a time: the command line and the server can't use it at once.

## Troubleshooting

- **"No session" or a login window that keeps coming back.** Log in in the window that opens; it waits 5 minutes. After updating moodle-mcp, a profile may need one more login: the browser library sometimes renames the file where it keeps the session (it did in October 2026).
- **"Downloading a browser".** There's no Edge or Chrome: the server is fetching Chromium once. Try again in a minute or two.
- **No window can open** (a container, a server without a screen). Log in on a machine with a screen and give the server that profile folder.
- **The agent says it can't do something.** Your role or limits may leave that tool out: ask it for `server_info`.
- **The profile is in use.** Another program (moodle-driver's command line, another client) has it open: close it, or give each its own profile.

## More

- [Developing moodle-mcp](docs/development.md): building, tests in Docker, a Moodle sandbox, adding tools.
- [Tool catalog](docs/tool-catalog.md): the tools planned and done, and how each works in Moodle.
- [Design decisions](.minispec/README.md).

## License

[MIT](LICENSE) © Falkenslab
