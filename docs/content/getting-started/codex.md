---
title: Set up Codex
sidebar_label: Codex
---

# Set up Codex

[Codex](https://developers.openai.com/codex) is OpenAI's coding agent, in your terminal (Codex CLI), in VS Code and in the Codex app; they share the same setup.

## Start

In a terminal, with **your Moodle site's address** instead of `https://campus.example.org`:

<Terminal title="Terminal">{`
$ codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added global MCP server 'moodle'.
`}</Terminal>

That writes a `[mcp_servers.moodle]` section in Codex's file, `~/.codex/config.toml` (`%USERPROFILE%\.codex\config.toml` on Windows). Open it and add two lines to that section: Codex waits 10 seconds for a server to start and 60 for a tool to finish, while the first start downloads moodle-mcp and some Moodle tasks (a backup, a long quiz) take minutes.

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.moodle.env]
MOODLE_URL = "https://campus.example.org"
```

Each line under `[mcp_servers.moodle.env]` is a [setting](../settings.md), such as `MOODLE_MCP_ROLE = "teacher"`. Without `MOODLE_URL`, the agent asks you for your site the first time.

Then start Codex (`codex`) and ask **"List my Moodle courses"**. The first time, a browser window opens at your Moodle login page: log in as usual ([Logging in the first time](./first-login.md)). Inside Codex, `/mcp` lists the servers and their tools.

## Where to set it up

Codex reads its setup from three places, each on top of the one before:

| Where | When it applies | File |
| --- | --- | --- |
| Yours | Always | `~/.codex/config.toml` |
| A project's | In that folder, once you trust it | `.codex/config.toml` in the folder |
| A profile | When you start Codex with `-p <name>` | `~/.codex/<name>.config.toml` |

A `[mcp_servers.moodle]` in a project's file or a profile changes the one in yours. Four ways to use that, the same for a teacher and a student; only the role changes: `MOODLE_MCP_ROLE = "teacher"` or `"student"` keeps the tools for what you do.

### Everywhere

You use Codex mostly for your courses: the setup of [Start](#start), in your own file, is there in every folder.

- **Why**: one setup for all your courses and sites.
- **Mind**: it's there in your other projects too; the tools that change Moodle ask you first.

### A classroom per project

You keep a folder per course and want the agent in each one to work **only in that course**: a [classroom](../limits.md#classrooms). In the folder, a `.codex/config.toml`:

```toml title=".codex/config.toml"
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.moodle.env]
MOODLE_MCP_COURSES = "https://campus.example.org/course/view.php?id=12"
MOODLE_MCP_ROLE = "teacher"
```

- **Why**: from there the agent can't touch another course; the site comes from the course's URL. In a repository you share with the course's other teachers, they get the same setup, and each logs in with their own account: the file holds no password.
- **Mind**: Codex applies a project's file only once you trust the folder, as it asks the first time you open it there. If your own file has a `moodle` server too, its settings that this one doesn't set still apply: keep the general one without `MOODLE_URL`, or name this one differently.

### A profile per classroom

Your course's materials aren't in one folder, or you want to choose the classroom when you start: a profile per course, `~/.codex/programming-1.config.toml`, with the same lines as the project's file above.

```bash
codex -p programming-1
```

- **Why**: the classroom goes with the command, whatever folder you're in.
- **Mind**: without `-p`, Codex starts with your own file, whatever it has.

### Without moodle-mcp by default

Leave moodle-mcp out of your own file and put it only in projects or profiles: Codex starts without Moodle, and you choose the course with the folder or `-p`.

:::caution One session at a time
All these setups share your login on a site, kept in one browser profile. Two Codex sessions using moodle-mcp on the same site at once can't both open it: the second one fails to start the browser. Close one, or give a classroom its own profile folder with `MOODLE_MCP_PROFILE_DIR` (and log in once there).
:::

## While you use it

**Codex asks before each moodle-mcp tool call** (*Allow*, *Allow for this session*, *Always allow* or *Cancel*). To let it run moodle-mcp's tools without asking, add this line to the `[mcp_servers.moodle]` section, only if you're comfortable with the agent changing Moodle on its own; it's safer with read-only access (`MOODLE_MCP_ACCESS = "read"`):

```toml
default_tools_approval_mode = "approve"
```

**What can't be undone asks you again**, from moodle-mcp itself: after Codex's own question, a second one says what will happen (True or False), and nothing runs until you say yes. You have ten minutes to answer, within the 600 seconds of `tool_timeout_sec`. See [Confirming what can't be undone](../limits.md#confirming-what-cant-be-undone).

:::note `codex exec`
In non-interactive runs (`codex exec`), nobody can answer: Codex cancels the tools that change Moodle unless `default_tools_approval_mode = "approve"`, and moodle-mcp's own question can't be answered either.
:::

## Changing or removing it

Edit the `[mcp_servers.moodle.env]` section where you set it up: a new session takes it. To remove it from your own file:

```bash
codex mcp remove moodle
```

From a project's file or a profile, delete its `[mcp_servers.moodle]` sections.
