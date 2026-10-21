---
title: Settings
sidebar_label: Settings
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Settings

Nothing is required. Without a site, the agent asks you for one the first time. Everything else has a sensible default.

## In short

Each setting is an environment variable of the server, or a command-line argument after the package name (in brackets); if both are given, the argument wins. Where the values are a choice, the default is in bold.

- **`MOODLE_URL`** (`--url`): Your Moodle site. Without it, the agent asks you for it.
  - Its address, such as `https://campus.example.org`. Any page of the site works.
- **`MOODLE_MCP_SITES`** (`--sites`): Several sites, each with a name; the first is where it starts. See [Several sites](./several-sites.md).
  - `name=address,…`, such as `school=https://campus.myschool.org,uni=https://moodle.myuni.edu`, or JSON.
- **`MOODLE_MCP_COURSES`** (`--courses`): The only courses the agent works in, your classrooms, on one site or several; their sites are added. See [Classrooms](./limits.md#classrooms).
  - Their URLs, such as `https://campus.myschool.org/course/view.php?id=12,https://moodle.myuni.edu/course/view.php?id=7`. Not set: **every course** of yours.
- **`MOODLE_MCP_ROLE`** (`--role`): Which tools the agent gets, by role. Fewer tools, better choices. See [Limiting the agent](./limits.md#your-role).
  - **`all`**: every tool.
  - `teacher`: a teacher's tools.
  - `student`: a student's tools.
- **`MOODLE_MCP_ACCESS`** (`--access`): Whether the agent may change Moodle. See [Limiting the agent](./limits.md#read-only).
  - **`write`**: it reads and changes.
  - `read`: it only looks, never changes anything.
- **`MOODLE_MCP_STUDENT_DATA`** (`--student-data`): What the AI sees of other people. See [Students' privacy](./privacy.md).
  - **`pseudonymize`**: aliases such as `A-7KQ2XM`, never names.
  - `block`: nothing about them.
  - `clear`: their names (only for an AI on your own computer).
- **`MOODLE_MCP_SCOPES`** (`--scopes`): The kinds of data its tools may touch. See [Limiting the agent](./limits.md#scopes).
  - **`all`**: everything.
  - `content`: building courses only, never students' work or grades.
  - `teacher`, `student`: a role's kinds.
  - Or a list, such as `content,communication`.
- **`MOODLE_MCP_CONFIRM`** (`--confirm`): Who asks you before what can't be undone, such as deleting (next release). See [Limiting the agent](./limits.md#confirming-what-cant-be-undone).
  - **`elicit`**: moodle-mcp asks you, in your app.
  - `client`: your app already asks you before each tool.
- **`MOODLE_MCP_ADVANCED`** (`--advanced`): The advanced tools. See [Limiting the agent](./limits.md#advanced-tools).
  - **`false`**: left out.
  - `true`: added: BigBlueButton, competencies, external tools (LTI), the content bank, notes and course blocks.
- **`MOODLE_MCP_CHANNEL`** (`--channel`): Which browser it works in.
  - Not set: **Edge, then Chrome, then Chromium**, the first it finds.
  - `msedge`: Microsoft Edge.
  - `chrome`: Google Chrome.
  - `chromium`: Chromium, downloaded the first time if needed.
  - `firefox`: Playwright's own Firefox, downloaded the first time, never the one you have installed (next release).
- **`MOODLE_MCP_HEADLESS`** (`--headless` / `--headed`): Whether you see the browser.
  - **`true`**: it works out of sight; a window opens only to log in, or when you ask to watch.
  - `false`: a visible window all the time.
- **`MOODLE_MCP_PROFILE_DIR`** (`--profile-dir`): The folder that keeps your login (the first site's, with several). Inside a Claude Code plugin, the plugin's data folder holds it instead.
  - A folder; **`~/.moodle-mcp/profile`** by default.
- **`MOODLE_MCP_DOWNLOAD_BROWSER`** (`--no-download-browser`): What to do when there's no Edge or Chrome.
  - **`true`**: download Chromium.
  - `false`: never download a browser.
- **`MOODLE_MCP_TRAIL`** (`--trail`): How activities are done as a student.
  - **`realistic`**: real pages at a reader's pace, so Moodle records views and completion.
  - `fast`: straight to the result.

A setting left empty, or that your app passes as an unexpanded `${…}`, counts as not set: its default applies, and `server_info` lists the ones that came so.

## Where settings go

Settings are environment variables in your AI app's configuration for moodle-mcp:

<Tabs groupId="client">
<TabItem value="claude-code" label="Claude Code" default>

One `-e NAME=value` for each, when you add the server:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

To change them later, `claude mcp remove moodle` and add it again.

</TabItem>
<TabItem value="claude-desktop" label="Claude Desktop">

In the `env` block of `claude_desktop_config.json`, then restart Claude Desktop:

```json
"env": {
  "MOODLE_URL": "https://campus.example.org",
  "MOODLE_MCP_ROLE": "teacher"
}
```

</TabItem>
<TabItem value="codex" label="Codex">

In the `[mcp_servers.moodle.env]` section of `~/.codex/config.toml`:

```toml
[mcp_servers.moodle.env]
MOODLE_URL = "https://campus.example.org"
MOODLE_MCP_ROLE = "teacher"
```

Or `--env NAME=value` for each, when you add it with `codex mcp add`.

</TabItem>
<TabItem value="agent-kit" label="agent-kit">

The moodle-teacher and moodle-student extensions ask for theirs when installed: `sites`, `headless`, `access` and `student_data` (see [agent-kit](./getting-started/agent-kit.md#its-settings)). An agent of your own gives any of these in its server's `env`.

</TabItem>
</Tabs>

## Changing them later

| Where you added it | How to change a setting |
| --- | --- |
| Claude Code, with `claude mcp add` | `claude mcp remove moodle` and add it again; or edit its `env` in `~/.claude.json` or `.mcp.json` and reconnect it in `/mcp` |
| Claude Desktop | Edit `claude_desktop_config.json`, then quit and open Claude Desktop |
| Codex | Edit `[mcp_servers.moodle.env]` in `~/.codex/config.toml`; a new session takes it |
| agent-kit | `/extensions config moodle-teacher access=read` in the chat (it applies there and then), or `<agent> extension config moodle-teacher access=read` in a terminal |
| Any of them, during a chat | Ask the agent: see [Changing settings during a chat](#changing-settings-during-a-chat) |

## Changing settings during a chat

The agent can change some settings for the rest of the session, through its `configure` tool. It can set the site if none was given, and it can make the limits stricter (fewer tools, more privacy), but never looser than your configuration. For example:

> For this chat, work only with course content, nothing about students.

## Sharing the session with moodle-driver

If you also use the `moodle` command line from [moodle-driver](https://falkenslab.github.io/moodle-driver/), both can share one login: point `MOODLE_MCP_PROFILE_DIR` at the command line's profile for your site, `~/.moodle-driver/sites/<host>/profiles/<account>`. A profile can only be open in one browser at a time, so the two can't use it at the same moment.
