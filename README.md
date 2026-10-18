<div align="center">

<img src="docs/static/img/logo.svg" alt="moodle-mcp logo: the m of Moodle plugged into a socket" width="112"/>

# moodle-mcp

**Let an AI agent work in your Moodle courses as you, with your own login.**<br/>
Your students stay anonymous to the AI, and you decide what it can do.

[![npm](https://img.shields.io/npm/v/@falkenslab/moodle-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/moodle-mcp)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![Moodle 4.5 and 5.x](https://img.shields.io/badge/Moodle-4.5%20%7C%205.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](LICENSE)

**[📖 Documentation](https://falkenslab.github.io/moodle-mcp/)** · [📖 Documentación en español](https://falkenslab.github.io/moodle-mcp/es/)

</div>

moodle-mcp is an [MCP](https://modelcontextprotocol.io) server that gives an AI agent such as Claude or Codex about 230 tools for Moodle: grade with your rubrics, build a quiz from your questions, answer the forum, see what's due this week. It works through a real browser on your computer, logged in as you, on any Moodle 4.5 or 5.x site.

## ✨ Why moodle-mcp

- 🔐 **Your login, never your password.** You log in yourself, in a browser window it opens, with single sign-on and two-factor if your site uses them.
- 🧩 **Nothing to install in Moodle.** No web service tokens, no administrator, no plugin: if you can log in, it works.
- 🕶️ **Students stay anonymous to the AI.** The agent sees other people as aliases such as `A-7KQ2XM`; only you can turn one back into a name, on your computer.
- 🎚️ **You set the limits.** Only a teacher's or a student's tools, read-only access, only course content: the agent can narrow them, never widen them.
- ✋ **It asks before changing things.** Every tool that changes Moodle says so, and the agent is told to confirm with you first.
- 🌐 **Several Moodle sites at once.** Your school's and your university's, one active at a time, and course content copied between them.
- 🤖 **Any MCP app.** Claude Code, Claude Desktop, Codex and others, on Windows, macOS and Linux.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later. Add moodle-mcp to your AI app, with your Moodle site's address:

```bash
# Claude Code
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp

# Codex
codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
```

On Windows, put `cmd /c` before `npx`. Then ask **"List my Moodle courses"**: the first time, a browser window opens for you to log in.

<details>
<summary>Claude Desktop</summary>

In Settings → Developer → Edit Config, add it to `claude_desktop_config.json` and restart Claude Desktop:

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

On Windows, `"command": "cmd"` and `"args": ["/c", "npx", "-y", "@falkenslab/moodle-mcp"]`.

</details>

## 💬 What you can ask

**👩‍🏫 As a teacher**

- "Which submissions to Task 3 still need grading? Propose a grade with the rubric, don't save anything yet."
- "Create a hidden quiz in section 2 with these GIFT questions, one per page."
- "Are there questions in the forum nobody has answered? Draft a short answer for each."
- "Who hasn't completed the unit 4 notes? Send them a friendly reminder."
- "Copy the unit 2 quiz from my school's Moodle to my university's."

**🧑‍🎓 As a student**

- "What do I have due in the next two weeks, across my courses?"
- "Make me a one-page study sheet from the unit 3 pages."
- "What did I get wrong in my last quiz? Explain the right answers."

## 📸 See it at work

A real session: Claude Code finds the submission to grade, reads it, proposes a grade with the assignment's rubric and saves it once you agree. The student is `A-8FT4A1` to the AI, never a name.

<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/moodle-mcp/main/docs/static/img/sessions/grading.en.png" alt="Claude Code grading a Moodle submission with its rubric through moodle-mcp" width="760"/>

</div>

More sessions with Claude Code and Codex, and what they changed in Moodle, are in the [use cases](https://falkenslab.github.io/moodle-mcp/use-cases).

## 🧰 What's inside

| Area | For example |
| --- | --- |
| 📚 Courses and content | Pages, files, folders, labels and links with your images; books, lessons, wikis, glossaries and databases with their entries, feedback questions; sections; restrictions and completion |
| 📝 Assignments and grading | Submissions, rubrics and marking guides (read and defined), extensions, the marking workflow |
| ❓ Quizzes and questions | Question banks and their categories, every question type, GIFT and Moodle XML import (GIFT checked first) and export, quiz statistics, quiz layout, results, manual grading |
| 📊 Gradebook and reports | The grader report, grade items and categories, CSV import, scales and letters, course and activity completion, choice and survey results, activity and participation reports, logs |
| 👥 Participants and groups | Enrolments, roles, groups and groupings, made automatically or from CSV |
| 💬 Forums and messages | Discussions, replies, ratings, workshops from submission to grades, notifications and private messages |
| 🏅 Badges | Create them, set what earns them, award them by hand |
| 📅 Calendar and to-dos | Events, deadlines, what's pending and what changed |
| 🧑‍🎓 As a student | Quizzes, assignments, lessons, surveys, choices, H5P and SCORM |
| 🧩 Advanced, on request | Course blocks, the content bank, BigBlueButton, competencies, notes about participants and external tools, with `MOODLE_MCP_ADVANCED=true` |
| 🔄 Course life cycle | Copies, backups and restores, whole or in part, backups read and anonymized, and imports, within a site or between sites |

Every tool, with what it takes and what it gives, is in the [tools reference](https://falkenslab.github.io/moodle-mcp/reference/tools).

## 📚 Documentation

- **[Getting started](https://falkenslab.github.io/moodle-mcp/getting-started/requirements)**: requirements, and step by step for Claude Code, Claude Desktop and Codex.
- **[Use cases](https://falkenslab.github.io/moodle-mcp/use-cases)**: real sessions as a teacher and as a student, with screenshots.
- **[Students' privacy](https://falkenslab.github.io/moodle-mcp/privacy)**: aliases, and what the AI does and doesn't see.
- **[Limiting the agent](https://falkenslab.github.io/moodle-mcp/limits)**: roles, read-only access and scopes.
- **[Several sites](https://falkenslab.github.io/moodle-mcp/several-sites)** and **[settings](https://falkenslab.github.io/moodle-mcp/settings)**.

## 🛠️ Developing

See [Developing moodle-mcp](https://falkenslab.github.io/moodle-mcp/developers) for building, tests in Docker and the Moodle sandbox, and [.minispec/](.minispec/README.md) for the design decisions.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
