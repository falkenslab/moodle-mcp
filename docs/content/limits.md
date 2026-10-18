---
title: Limiting what the agent can do
sidebar_label: Limiting the agent
---

# Limiting what the agent can do

By default the agent gets every tool: about 230, for teachers and students, to read and to change. Three settings narrow that down. They add up: a tool is there only if every setting allows it.

| Setting | Question it answers | Values |
| --- | --- | --- |
| [`MOODLE_MCP_ROLE`](#your-role) | Do you teach, study, or both? | `all`, `teacher`, `student` |
| [`MOODLE_MCP_ACCESS`](#read-only) | May it change things in Moodle? | `write`, `read` |
| [`MOODLE_MCP_SCOPES`](#scopes) | Which kinds of data may it touch? | `all`, `content`, `teacher`, `student`, or a list |

Like [students' privacy](./privacy.md), only you set them, in your AI app's configuration. The agent can narrow them further for a session, never widen them.

To see the limits in force, ask the agent:

> What are moodle-mcp's current limits?

## Your role

`MOODLE_MCP_ROLE` keeps only the tools for what you do in Moodle. Fewer tools also means the agent picks the right one more easily, and spends less of every request reading their descriptions.

| Role | Tools | What's in it | Size of the tools' descriptions |
| --- | --- | --- | --- |
| `all` (default) | 235 | Everything | about 54,600 tokens |
| `teacher` | 219 | Building and running courses, grading, people, reports, forums and messages | about 52,800 tokens |
| `student` | 83 | Reading courses, doing activities, your grades and to-dos, forums and messages | about 15,500 tokens |

Claude Code loads tools as it needs them, so the size matters less there. Claude Desktop, Codex and most other apps load them all at the start of each chat.

## Read only

`MOODLE_MCP_ACCESS=read` keeps only the tools that change nothing in Moodle. The agent can read courses, submissions, grades and reports, but can't grade, post, send or edit.

| With role | Tools left |
| --- | --- |
| `all` | 91 |
| `teacher` | 86 |
| `student` | 48 |

Tools that look like reading but start something in Moodle (a lesson, a quiz attempt, a SCORM attempt) are left out too. Downloading a course's files or exporting its grades stays: it changes nothing in Moodle, only saves a file on your computer, and your AI app may still ask you before each.

This is how a read-only assistant answers a request to grade:

<Screenshot app="Claude Code" session="reading-assistant" alt="Claude Code with read-only access refusing to grade" />

## Scopes

`MOODLE_MCP_SCOPES` chooses by the kind of data a tool touches. The most useful one is `content`: an agent that builds and organizes courses (activities, sections, question banks, rubrics, calendar, gradebook setup, groups, backups without users) and **never sees students' work or grades**, nor writes to students.

| Profile | For |
| --- | --- |
| `all` (default) | Everything, including the [browser tools](./reference/tools.md#browser) |
| `teacher` | Content, students' work, grading, forums and messages |
| `student` | Reading courses, doing activities, your own grades, forums and messages |
| `content` | Building and managing courses only |

Or a list of scopes, separated by commas: `content`, `student-data`, `grading`, `communication`, `as-student`, `browser`. For example, `content,communication` builds courses and posts announcements, but doesn't read submissions.

## Advanced tools

Some areas of Moodle few people use: BigBlueButton, competencies, external tools (LTI), the content bank, notes about participants and course blocks. Their 30 tools are off by default, so every chat doesn't pay for them. `MOODLE_MCP_ADVANCED=true` turns them on, and the other limits still apply to them. `server_info` says whether they're on; the agent can't turn them on itself.

## Examples

A teacher who wants help building courses, and nothing else:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_SCOPES=content -- npx -y @falkenslab/moodle-mcp
```

That's 133 tools, about 31,000 tokens.

A student's study assistant that can't submit or post anything:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=student -e MOODLE_MCP_ACCESS=read -- npx -y @falkenslab/moodle-mcp
```

A teacher's assistant that reports on courses but can't change them, with students' data blocked:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_ACCESS=read -e MOODLE_MCP_STUDENT_DATA=block -- npx -y @falkenslab/moodle-mcp
```

In Claude Desktop and Codex, the same settings go in the `env` section of the configuration: see [Settings](./settings.md).
