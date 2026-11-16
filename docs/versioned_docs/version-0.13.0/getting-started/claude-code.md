---
title: Set up Claude Code
sidebar_label: Claude Code
---

# Set up Claude Code

[Claude Code](https://claude.com/claude-code) is Claude in a terminal window, or inside VS Code and other editors. If you don't have it yet, follow [its installation guide](https://docs.claude.com/en/docs/claude-code/setup) first.

## 1. Install it

Make a folder for your work with Moodle, such as a `Moodle` folder in your Documents. Open a terminal in it and type:

<Terminal>{`$ claude mcp add moodle -- npx -y @falkenslab/moodle-mcp`}</Terminal>

That's all. It tells Claude Code that, in this folder, it has a helper called `moodle`: moodle-mcp, which it downloads and starts by itself when needed.

## 2. Try it

Open Claude Code **in that same folder** (type `claude` in the terminal) and ask:

<Prompt>{`List my Moodle courses.`}</Prompt>

The first time:

1. **It asks you for your Moodle's address**, such as `https://campus.myschool.org`. Copy it from your browser when you're in Moodle. It remembers it for next time.
2. **A browser window opens** at your Moodle's login page: log in as you always do. moodle-mcp never sees your password, and keeps you logged in for the next times. See [Logging in the first time](./first-login.md).

Then the agent lists your courses. You're ready.

## 3. Where it's kept

Claude Code wrote that setup in its own file, `.claude.json`, in your user folder (`C:\Users\<you>\.claude.json` on Windows, `~/.claude.json` on macOS and Linux), under the folder where you installed it. To see it without opening the file:

<Terminal>{`$ claude mcp get moodle`}</Terminal>

Inside the file, it looks like this:

```json
"mcpServers": {
  "moodle": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@falkenslab/moodle-mcp"],
    "env": {}
  }
}
```

`env` is where the settings go: each one is a line `"NAME": "value"`. It's empty for now, so moodle-mcp works with its defaults, which are safe ones.

## 4. Make it yours {#make-it-yours}

Each change below is one setting. The easiest way to add one is to remove moodle-mcp and add it again with the setting, `-e NAME=value`, in the same folder:

<Terminal>{`$ claude mcp remove moodle
$ claude mcp add moodle -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp`}</Terminal>

Several settings, several `-e`. You can also ask Claude Code, in a chat, to do it for you ("add the setting MOODLE_MCP_ROLE=teacher to moodle"). Either way, start a new conversation afterwards.

### If you teach

`-e MOODLE_MCP_ROLE=teacher`

The agent gets only a teacher's tools: building courses, grading, the forum, reports. Fewer tools to choose from, so it chooses better, and it doesn't offer you things like "start this quiz as a student".

### If you study

`-e MOODLE_MCP_ROLE=student`

The agent gets only a student's tools: reading your courses, what's due, doing activities, your grades. About a third of them, so it's quicker and chooses better.

### Your students' names

You don't need to do anything: **by default the AI never sees other people's names**. It sees each person as an alias, such as `A-7KQ2XM`, always the same one, and only you can find out who it is, on your computer ([Students' privacy](../privacy.md)). Two other choices:

- `-e MOODLE_MCP_STUDENT_DATA=block`: the AI sees nothing at all about other people; for an agent that only builds content.
- `-e MOODLE_MCP_STUDENT_DATA=clear`: real names. Only with an AI that runs on your own computer, never with Claude.

### So it only looks

`-e MOODLE_MCP_ACCESS=read`

The agent can read your courses, submissions and grades, but can't change anything: no grading, posting or creating. Good for trying it out calmly, or for an assistant that only answers questions.

### Only this year's courses

`-e MOODLE_MCP_COURSES=https://campus.myschool.org/course/view.php?id=12`

The agent works only in the courses you list (their addresses, separated by commas), not in last year's or other ones. Copy each address from your browser when you're on the course's page. See [Classrooms](../limits.md#classrooms).

### To watch what it does

`-e MOODLE_MCP_HEADLESS=false`

moodle-mcp works in a browser you don't see; with this, you see its window all the time. You can also just ask "show me the browser" when you want to watch ([Watching the agent](./watching.md)).

Every setting, with all its choices, is in [Settings](../settings.md).

## 5. While you use it {#while-you-use-it}

- **Claude Code asks you before each step** that uses moodle-mcp: *Yes*, or *Yes, and don't ask again* for one you trust.
- **What can't be undone asks you again**: before deleting something, unenrolling someone or resetting a course, moodle-mcp itself asks you, with a yes or no. Nothing happens until you say yes.

To stop being asked for the steps that only read Moodle, add this to the file `.claude/settings.json` in your user folder:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__get_*", "mcp__moodle__list_*"],
    "ask": ["mcp__moodle__get_lesson_page"]
  }
}
```

The `ask` line is the one exception: as a student, opening a lesson's page counts as progress in it.

## 6. In other folders {#where-to-set-it-up}

What you installed in step 1 is there only in that folder. That's a good start: Moodle stays where you work on your courses. When you want it otherwise:

| You want | Add to the install command | Kept in |
| --- | --- | --- |
| Moodle in every folder | `--scope user` | `.claude.json`, for all your folders |
| A folder for one course, shared with other teachers through a repository | `--scope project` | `.mcp.json` in that folder |

- **A folder per course**: in each course's folder, install it with `-e MOODLE_MCP_COURSES=` and that course's address. There, the agent works only in that course. With `--scope project` it's written in a `.mcp.json` file in the folder: if you share the folder with other teachers (a repository), they get the same setup and each logs in with their own account; the file holds no password.
- **Everywhere, and a course folder**: install it with `--scope user` for everywhere, and in a course's folder again with that course. In that folder, the folder's one wins.
- **One at a time**: all of them share your login. Two Claude Code windows using moodle-mcp at the same time on the same Moodle can't both open it: close one, or give one its own login folder with `-e MOODLE_MCP_PROFILE_DIR=` and a folder.

To remove it from a folder: `claude mcp remove moodle` there (with `--scope user` or `--scope project` if you added it so).
