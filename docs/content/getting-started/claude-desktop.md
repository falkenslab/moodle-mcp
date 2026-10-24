---
title: Set up Claude Desktop
sidebar_label: Claude Desktop
---

# Set up Claude Desktop

[Claude Desktop](https://claude.ai/download) is the Claude app for Windows and macOS. You add moodle-mcp once to its settings file, and it's there in every chat.

## 1. Open its settings file

In Claude Desktop, go to **Settings** (on Windows, the menu ☰ → *File* → *Settings*; on macOS, *Claude* → *Settings*), choose **Developer** and click **Edit Config**. A folder opens with the file `claude_desktop_config.json`; open it with a text editor, such as Notepad or TextEdit. It lives in:

- **Windows**: `C:\Users\<you>\AppData\Roaming\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## 2. Install it

Replace what's in the file with this, and save:

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"]
    }
  }
}
```

If the file already has other helpers under `mcpServers`, don't replace it: add the `"moodle": { … }` block next to them, with a comma between blocks.

Then **quit Claude Desktop completely** (on Windows, also from its icon next to the clock) and open it again. In a new chat, the **tools** button (the sliders under the message box) lists `moodle`. If it doesn't, the file most likely has a missing comma or quote: see [Troubleshooting](../troubleshooting.md).

## 3. Try it

In a new chat, ask:

<Prompt>{`List my Moodle courses.`}</Prompt>

The first time:

1. **Claude asks your permission** to use moodle-mcp's tools: *Allow once* or *Allow always*.
2. **It asks you for your Moodle's address**, such as `https://campus.myschool.org`. Copy it from your browser when you're in Moodle. It remembers it for next time.
3. **A browser window opens** at your Moodle's login page: log in as you always do. moodle-mcp never sees your password, and keeps you logged in for the next times. See [Logging in the first time](./first-login.md).

Then Claude lists your courses. You're ready.

## 4. Make it yours {#make-it-yours}

Each change below is one setting, a line in an `env` block you add inside `"moodle"`:

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"],
      "env": {
        "MOODLE_MCP_ROLE": "teacher"
      }
    }
  }
}
```

Several settings, one line each, with a comma between lines. Save the file, quit Claude Desktop completely and open it again.

### If you teach

`"MOODLE_MCP_ROLE": "teacher"`

Claude gets only a teacher's tools: building courses, grading, the forum, reports. Fewer tools to choose from, so it chooses better, and it doesn't offer you things like "start this quiz as a student".

### If you study

`"MOODLE_MCP_ROLE": "student"`

Claude gets only a student's tools: reading your courses, what's due, doing activities, your grades. About a third of them, so it's quicker and chooses better.

### Your students' names

You don't need to do anything: **by default the AI never sees other people's names**. It sees each person as an alias, such as `A-7KQ2XM`, always the same one, and only you can find out who it is, on your computer ([Students' privacy](../privacy.md)). Two other choices:

- `"MOODLE_MCP_STUDENT_DATA": "block"`: the AI sees nothing at all about other people; for an assistant that only builds content.
- `"MOODLE_MCP_STUDENT_DATA": "clear"`: real names. Only with an AI that runs on your own computer, never with Claude.

### So it only looks

`"MOODLE_MCP_ACCESS": "read"`

Claude can read your courses, submissions and grades, but can't change anything: no grading, posting or creating. Then you can *Allow always* every tool without worry.

### Only this year's courses

`"MOODLE_MCP_COURSES": "https://campus.myschool.org/course/view.php?id=12"`

Claude works only in the courses you list (their addresses, separated by commas), not in last year's or other ones. Copy each address from your browser when you're on the course's page. See [Classrooms](../limits.md#classrooms).

### To watch what it does

`"MOODLE_MCP_HEADLESS": "false"`

moodle-mcp works in a browser you don't see; with this, you see its window all the time. You can also just ask "show me the browser" when you want to watch ([Watching the agent](./watching.md)).

Every setting, with all its choices, is in [Settings](../settings.md).

## 5. While you use it {#while-you-use-it}

- **Claude asks your permission the first time it uses each tool**: keep the ones that change Moodle (grading, posting, creating) on *Allow once*, unless it can only look.
- **What can't be undone asks you again**: before deleting something, unenrolling someone or resetting a course, moodle-mcp itself asks you, with a yes or no, and nothing happens until you say yes. This needs an app that can show that question (MCP elicitation); if yours can't, those steps are refused with a message saying so ([Confirming what can't be undone](../limits.md#confirming-what-cant-be-undone)).

To remove moodle-mcp, delete its `"moodle"` block from the file, and restart Claude Desktop.
