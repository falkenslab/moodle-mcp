---
title: Set up Claude Desktop
sidebar_label: Claude Desktop
---

# Set up Claude Desktop

[Claude Desktop](https://claude.ai/download) is the Claude app for Windows and macOS. You add moodle-mcp to its configuration file once, and it's there in every chat.

## Start

1. In Claude Desktop, go to **Settings** (on Windows, the menu ☰ → *File* → *Settings*; on macOS, *Claude* → *Settings*), choose **Developer** and click **Edit Config**. It opens the folder with `claude_desktop_config.json` (`%APPDATA%\Claude` on Windows, `~/Library/Application Support/Claude` on macOS): open that file with a text editor.
2. Paste this, with **your Moodle site's address** instead of `https://campus.example.org`. If the file already has servers under `mcpServers`, add the `"moodle": { … }` block next to them, with a comma between blocks.

   ```json title="claude_desktop_config.json"
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

3. Quit Claude Desktop completely (on Windows, also from the icon next to the clock) and open it again. In a new chat, the **tools** button (the sliders under the message box) lists `moodle` with its tools; if it doesn't, see [Troubleshooting](../troubleshooting.md): the usual cause is a missing comma or quote.
4. Ask **"List my Moodle courses"**. The first time, a browser window opens at your Moodle login page: log in as usual ([Logging in the first time](./first-login.md)).

Each line in `env` is a [setting](../settings.md). Without `MOODLE_URL`, Claude asks you for your site the first time.

## What to give it

Claude Desktop has one configuration for every chat, so the choice is what moodle-mcp gets there. Three common ones, the same for a teacher and a student; only the role changes: `"MOODLE_MCP_ROLE": "teacher"` or `"student"` keeps the tools for what you do.

### Your whole site

The block of [Start](#start), with your role:

```json
"env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ROLE": "teacher" }
```

- **Why**: everything you do in Moodle, from any chat.
- **Mind**: the agent sees every course of yours, last year's too.

### Only your classrooms

The courses of this year, by their URLs, on one site or several: the sites come from the URLs, so there's no `MOODLE_URL`.

```json
"env": {
  "MOODLE_MCP_COURSES": "https://campus.example.org/course/view.php?id=12,https://campus.example.org/course/view.php?id=15",
  "MOODLE_MCP_ROLE": "teacher"
}
```

- **Why**: the agent can't touch another course, not even by mistake with a similar name. See [Classrooms](../limits.md#classrooms).
- **Mind**: a new course means a new URL in the list, and a restart.

### A read-only assistant

To ask about your courses (what's pending, how the class is doing) without the agent being able to change anything:

```json
"env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ACCESS": "read" }
```

- **Why**: you can then *Allow always* every tool without worry, since none of them changes Moodle.
- **Mind**: to grade, post or create, change it back.

These combine: classrooms and read-only together, for instance.

## While you use it

**Claude asks your permission the first time it uses each tool**: *Allow once* or *Allow always*. Keep the tools that change Moodle (grading, posting, creating) on *Allow once*, unless access is read-only.

**What can't be undone asks you again**, from moodle-mcp itself, before deleting an activity, unenrolling someone or resetting a course: nothing runs until you say yes, and you have ten minutes to answer. Your app has to support these questions (MCP elicitation); if it doesn't, those tools are refused with a message saying so. See [Confirming what can't be undone](../limits.md#confirming-what-cant-be-undone).

## Changing or removing it

Edit the `env` block in `claude_desktop_config.json`, or remove the `"moodle"` block, then quit Claude Desktop and open it again.
