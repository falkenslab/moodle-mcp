---
title: Set up Codex
sidebar_label: Codex
---

# Set up Codex

[Codex](https://developers.openai.com/codex) is OpenAI's agent, in a terminal window (Codex CLI), inside VS Code or in the Codex app; all of them share the same setup.

## 1. Install it

Open a terminal and type:

```bash
codex mcp add moodle -- npx -y @falkenslab/moodle-mcp
```

That tells Codex it has a helper called `moodle`: moodle-mcp, which it downloads and starts by itself when needed.

## 2. Give it time {#give-it-time}

Codex wrote that in its own file, `config.toml`, in a `.codex` folder in your user folder (`C:\Users\<you>\.codex\config.toml` on Windows, `~/.codex/config.toml` on macOS and Linux). Open it with any text editor; you'll find:

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
```

Add two lines under it and save:

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600
```

Codex gives a helper 10 seconds to start and one minute for each task, and gives up after that. The first start downloads moodle-mcp, and some Moodle tasks take longer (a backup, a long quiz, waiting for you to confirm something): these lines give it two minutes to start and ten for each task.

## 3. Try it

Start Codex (type `codex` in a terminal) and ask:

> List my Moodle courses.

The first time:

1. **It asks you for your Moodle's address**, such as `https://campus.myschool.org`. Copy it from your browser when you're in Moodle. It remembers it for next time.
2. **A browser window opens** at your Moodle's login page: log in as you always do. moodle-mcp never sees your password, and keeps you logged in for the next times. See [Logging in the first time](./first-login.md).

Then the agent lists your courses. You're ready.

## 4. Make it yours {#make-it-yours}

Each change below is one setting, a line in `config.toml`, in its own section under the one you already have:

```toml
[mcp_servers.moodle.env]
MOODLE_MCP_ROLE = "teacher"
```

Several settings, one line each in that same section. Save the file and start a new Codex session: it reads the file when it starts.

### If you teach

`MOODLE_MCP_ROLE = "teacher"`

The agent gets only a teacher's tools: building courses, grading, the forum, reports. Fewer tools to choose from, so it chooses better, and it doesn't offer you things like "start this quiz as a student".

### If you study

`MOODLE_MCP_ROLE = "student"`

The agent gets only a student's tools: reading your courses, what's due, doing activities, your grades. About a third of them, so it's quicker and chooses better.

### Your students' names

You don't need to do anything: **by default the AI never sees other people's names**. It sees each person as an alias, such as `A-7KQ2XM`, always the same one, and only you can find out who it is, on your computer ([Students' privacy](../privacy.md)). Two other choices:

- `MOODLE_MCP_STUDENT_DATA = "block"`: the AI sees nothing at all about other people; for an agent that only builds content.
- `MOODLE_MCP_STUDENT_DATA = "clear"`: real names. Only with an AI that runs on your own computer, never with Codex's.

### So it only looks

`MOODLE_MCP_ACCESS = "read"`

The agent can read your courses, submissions and grades, but can't change anything: no grading, posting or creating. Good for trying it out calmly, or for an assistant that only answers questions.

### Only this year's courses

`MOODLE_MCP_COURSES = "https://campus.myschool.org/course/view.php?id=12"`

The agent works only in the courses you list (their addresses, separated by commas), not in last year's or other ones. Copy each address from your browser when you're on the course's page. See [Classrooms](../limits.md#classrooms).

### To watch what it does

`MOODLE_MCP_HEADLESS = "false"`

moodle-mcp works in a browser you don't see; with this, you see its window all the time. You can also just ask "show me the browser" when you want to watch ([Watching the agent](./watching.md)).

Every setting, with all its choices, is in [Settings](../settings.md).

## 5. While you use it {#while-you-use-it}

- **Codex asks you before each step** that uses moodle-mcp: *Allow*, *Allow for this session*, *Always allow* or *Cancel*.
- **What can't be undone asks you again**: before deleting something, unenrolling someone or resetting a course, moodle-mcp itself asks you, True or False. Nothing happens until you say yes; you have ten minutes.

To let it use moodle-mcp without asking each time, add `default_tools_approval_mode = "approve"` under `[mcp_servers.moodle]`. Only if you're comfortable with the agent changing Moodle on its own; it's safer together with `MOODLE_MCP_ACCESS = "read"`.

## 6. Other setups {#where-to-set-it-up}

What you installed is there wherever you open Codex. Codex can also read a setup for one folder only, or one you choose when you start it:

| You want | Write the same `[mcp_servers.moodle]` sections in | Applies |
| --- | --- | --- |
| A folder for one course | `.codex/config.toml` inside that folder | In that folder, once you tell Codex you trust it |
| To choose the course when you start | `.codex/<name>.config.toml` in your user folder, such as `programming-1.config.toml` | When you start with `codex -p programming-1` |

- **A folder per course**: with `MOODLE_MCP_COURSES` and that course's address, the agent in that folder works only in that course. If you share the folder with other teachers (a repository), they get the same setup and each logs in with their own account; the file holds no password.
- **These add to yours**: a folder's or a profile's settings go on top of your own file's. If your own file sets `MOODLE_URL` or another setting, it still applies there unless the folder's file sets it too.
- **One at a time**: all of them share your login. Two Codex sessions using moodle-mcp at the same time on the same Moodle can't both open it: close one, or give one its own login folder with `MOODLE_MCP_PROFILE_DIR`.

To remove moodle-mcp from your own file: `codex mcp remove moodle`. From a folder's file or a profile, delete its `[mcp_servers.moodle]` sections.
