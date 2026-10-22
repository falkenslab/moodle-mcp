---
title: Set up Claude Code
sidebar_label: Claude Code
---

# Set up Claude Code

[Claude Code](https://claude.com/claude-code) is Claude in your terminal, or in VS Code and other editors; they share the same setup. If you don't have it yet, follow [its installation guide](https://docs.claude.com/en/docs/claude-code/setup) first.

## Start

In a terminal, with **your Moodle site's address** instead of `https://campus.example.org`:

<Terminal title="Terminal">{`
$ claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: npx -y @falkenslab/moodle-mcp to user config
$ claude mcp list
moodle: npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

- `moodle` is the server's name: its tools reach Claude as `mcp__moodle__…`.
- `--scope user` puts it in every folder; the next section has other choices.
- Each `-e NAME=value` is a [setting](../settings.md). Without `MOODLE_URL`, Claude asks you for your site the first time.
- `npx -y @falkenslab/moodle-mcp` downloads and starts the latest version; `@falkenslab/moodle-mcp@0.5.0` keeps one.

Then start Claude Code and ask **"List my Moodle courses"**. The first time, a browser window opens at your Moodle login page: log in as usual ([Logging in the first time](./first-login.md)). Inside Claude Code, `/mcp` shows the servers and their tools.

You can also ask Claude Code, in a conversation, to run that command for you: the server is there in your next conversation.

## Where to set it up

Claude Code keeps a server in one of three places, its **scope**, which decides in which folders it's there:

| Scope | Where it's there | Kept in | Shared |
| --- | --- | --- | --- |
| `user` | Every folder you open Claude Code in | `~/.claude.json` | No |
| `local` (the default) | Only the folder where you added it | `~/.claude.json`, under that folder | No |
| `project` | Only that folder, for whoever opens it | `.mcp.json` in the folder | Yes, if the folder is a repository |

When the same name is in more than one, the folder's own wins: `local` first, then `project`, then `user`. Four ways to use that, the same for a teacher and a student; only the role changes: `MOODLE_MCP_ROLE=teacher` or `student` keeps the tools for what you do.

### Everywhere

You use Claude Code mostly for your courses, and want Moodle at hand wherever you open it.

```bash
claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

- **Why**: one setup for all your courses and sites; nothing to remember.
- **Mind**: it's there in your other projects too. Claude Code loads tools only when it needs them, and the tools that change Moodle ask you first, but if you also program with Claude Code you may prefer one of the next ones.

### A folder for Moodle

You also use Claude Code for other things, and want Moodle only where you work on your courses: a folder such as `~/moodle`, with your notes, rubrics or exams.

```bash
cd ~/moodle
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=student -- npx -y @falkenslab/moodle-mcp
```

- **Why**: Moodle stays out of your other projects; open Claude Code in that folder when you want it.
- **Mind**: in any other folder, moodle-mcp isn't there.

### A classroom per folder

You keep a folder per course (a subject's materials as a teacher, your notes as a student) and want the agent in each one to work **only in that course**: a [classroom](../limits.md#classrooms).

```bash
cd ~/courses/programming-1
claude mcp add moodle --scope project -e MOODLE_MCP_COURSES=https://campus.example.org/course/view.php?id=12 -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

- **Why**: the agent can't touch another course from there, not even by mistake with a similar name or last year's copy; the site comes from the course's URL.
- **`project` or `local`**: `--scope project` writes `.mcp.json` in the folder. If it's a repository you share with the course's other teachers, they get the same setup when they open it: Claude Code asks each of them to approve it the first time, and each logs in with their own account. `.mcp.json` holds no password, only the course's URL and the settings. For a folder only you use, leave `--scope project` out.

### Everywhere, and a classroom where it matters

Both at once: moodle-mcp everywhere (`user`), and in a course's folder a server with the **same name**, `moodle`, held to that classroom (`project` or `local`). In that folder the classroom wins; everywhere else, the general one.

:::caution One session at a time
All these setups share your login on a site, kept in one browser profile. Two Claude Code sessions using moodle-mcp on the same site at once, in two folders, can't both open it: the second one fails to start the browser. Close one, or give a folder its own profile with `-e MOODLE_MCP_PROFILE_DIR=…` (and log in once there).
:::

## While you use it

**Claude Code asks before each tool call**, showing its name and what it will send: *Yes* each time, or *Yes, and don't ask again* for a tool you trust. To approve the tools that only read Moodle once and for all, add them to your settings (`~/.claude/settings.json`); in moodle-mcp they start with `get_` or `list_`:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__get_*", "mcp__moodle__list_*"],
    "ask": ["mcp__moodle__get_lesson_page"]
  }
}
```

The `ask` line is the one exception: as a student, opening a lesson's page records your progress in it.

`mcp__moodle__*` would approve every tool, those that change Moodle too: only with read-only access (`MOODLE_MCP_ACCESS=read`), where none of them can.

**What can't be undone asks you again**, from moodle-mcp itself: before deleting an activity, unenrolling someone or resetting a course, a question in Claude Code says what will happen, and nothing runs until you say yes. You have ten minutes to answer. See [Confirming what can't be undone](../limits.md#confirming-what-cant-be-undone).

## Changing or removing it

`claude mcp get moodle` shows its setup and where it's kept. To change a setting, remove it and add it again with the new values, with the scope you added it with:

```bash
claude mcp remove moodle --scope user
```

Or edit it by hand: a `project` server is in the folder's `.mcp.json`; `user` and `local` ones are in `~/.claude.json` (`%USERPROFILE%\.claude.json` on Windows), Claude Code's own file, at the top under `mcpServers` and under the folder's entry in `projects`. The same block in either:

```json title=".mcp.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"],
      "env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ROLE": "teacher" }
    }
  }
}
```

Claude Code reads it when it starts, or when you reconnect the server in `/mcp`.
