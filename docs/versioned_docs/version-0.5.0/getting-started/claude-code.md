---
title: Set up Claude Code
sidebar_label: Claude Code
---

# Set up Claude Code

[Claude Code](https://claude.com/claude-code) is Claude in your terminal, or in VS Code and other editors. If you don't have it yet, follow [its installation guide](https://docs.claude.com/en/docs/claude-code/setup) first.

## 1. Add moodle-mcp

Open a terminal and run this command, with **your Moodle site's address** instead of `https://campus.example.org`:

<Terminal title="Terminal">{`
$ claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: npx -y @falkenslab/moodle-mcp to user config
`}</Terminal>

What each part means:

- `moodle` is the name you give the server. The tools show up in Claude as `moodle` tools.
- `--scope user` makes it available in every folder you open Claude Code in. It's one of several ways: see [Where to set it up](#where-to-set-it-up).
- `-e MOODLE_URL=…` is your site. You can leave it out, and Claude will ask you for the site the first time.
- `npx -y @falkenslab/moodle-mcp` downloads and starts the latest version.

You can also ask Claude Code itself, in a conversation, to run that command for you: the server is there in your next conversation.

## 2. Check it's there

<Terminal title="Terminal">{`
$ claude mcp list
Checking MCP server health…

moodle: npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

You should see `moodle` with `✔ Connected`, next to any other servers you have.

The first time, `npx` downloads moodle-mcp, so it may take a few seconds.

## 3. Start Claude and try it

Start Claude Code in any folder, and ask:

> List my Moodle courses.

The first time, a browser window opens at your Moodle login page: log in as usual. [Logging in the first time](./first-login.md) explains what happens next.

Inside Claude Code, the `/mcp` command shows the servers and their tools, and lets you reconnect one.

## Approving tool calls

Claude Code asks you before each tool call, showing its name and what it will send. You can answer *Yes* each time, or *Yes, and don't ask again* for a tool you trust.

To approve the tools that only read Moodle once and for all, add them to your settings. For example, in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__list_courses", "mcp__moodle__get_course_structure", "mcp__moodle__list_assignments"]
  }
}
```

Leave the tools that change Moodle (grading, posting, creating) out of that list, so Claude keeps asking before using them.

:::tip Fewer tools, better answers
If you only teach, or only study, tell moodle-mcp your role: Claude gets only the tools for it, and picks them better. Add `-e MOODLE_MCP_ROLE=teacher` (or `student`) to the command in step 1. See [Limiting what the agent can do](../limits.md).
:::

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

## By hand: the configuration file

Claude Code reads its servers from two files:

- `.mcp.json` in a project's folder: only there, and it can go in the project's repository. Claude Code asks you to trust it the first time. That's where `--scope project` writes;
- `~/.claude.json` (`%USERPROFILE%\.claude.json` on Windows): under `mcpServers` at the top, every folder (`--scope user`); under a folder's entry in `projects`, only that folder (the default, `local`). It's Claude Code's own file, with much else in it: prefer `claude mcp add` for these two.

```json title=".mcp.json"
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

Other [settings](../settings.md) go in `env`. Claude Code reads the file when it starts, or when you reconnect the server in `/mcp`.

## Changing or removing it

`claude mcp get moodle` shows its setup and where it's kept. To change a setting, edit its `env` in the file, or remove the server and add it again with the new values, with the same scope you added it with:

```bash
claude mcp remove moodle --scope user
```

To use a specific version instead of the latest, write it after the package name: `@falkenslab/moodle-mcp@0.5.0`.
