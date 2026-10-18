---
title: Settings
sidebar_label: Settings
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Settings

Nothing is required. Without a site, the agent asks you for one the first time. Everything else has a sensible default.

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

</TabItem>
</Tabs>

Each setting can also be a command-line argument after the package name (such as `npx -y @falkenslab/moodle-mcp --role teacher`). If both are given, the argument wins.

## All settings

| Variable | Argument | Default | What it does |
| --- | --- | --- | --- |
| `MOODLE_URL` | `--url` | none | Your Moodle site, such as `https://campus.example.org`. Any page of the site works. |
| `MOODLE_MCP_SITES` | `--sites` | none | Several sites, the first active: `name=url,…` or JSON. See [Several sites](./several-sites.md). |
| `MOODLE_MCP_STUDENT_DATA` | `--student-data` | `pseudonymize` | What the AI sees of other people: `block`, `pseudonymize` or `clear`. See [Students' privacy](./privacy.md). |
| `MOODLE_MCP_ROLE` | `--role` | `all` | Only the tools for a role: `teacher`, `student` or `all`. See [Limiting the agent](./limits.md#your-role). |
| `MOODLE_MCP_ACCESS` | `--access` | `write` | `read` keeps only the tools that change nothing. See [Limiting the agent](./limits.md#read-only). |
| `MOODLE_MCP_ADVANCED` | `--advanced` | `false` | `true` adds the advanced tools: BigBlueButton, competencies, external tools (LTI), the content bank, notes and course blocks. See [Limiting the agent](./limits.md#advanced-tools). |
| `MOODLE_MCP_SCOPES` | `--scopes` | `all` | The kinds of tools: a profile or a list of scopes. See [Limiting the agent](./limits.md#scopes). |
| `MOODLE_MCP_PROFILE_DIR` | `--profile-dir` | `~/.moodle-mcp/profile` | The browser profile folder that keeps your session (the first site's, with several). Inside a Claude Code plugin, the plugin's data folder holds it instead. |
| `MOODLE_MCP_CHANNEL` | `--channel` | Edge, then Chrome, then Chromium | Which browser to use: `msedge`, `chrome` or `chromium`. |
| `MOODLE_MCP_HEADLESS` | `--headless` / `--headed` | `true` | `false` works with a visible window all the time. Logging in always shows one. |
| `MOODLE_MCP_DOWNLOAD_BROWSER` | `--no-download-browser` | `true` | `false` never downloads Chromium when there's no Edge or Chrome. |
| `MOODLE_MCP_TRAIL` | `--trail` | `realistic` | Activities done as a student: `realistic` (real pages, at a reader's pace, so Moodle records views and completion) or `fast`. |

A setting left empty, or that your app passes as an unexpanded `${…}` (as Codex does with a plugin's settings), counts as not set: its default applies, and `server_info` lists the ones that came so. Without a site, the agent asks you for your Moodle's address and adds it.

## Changing settings during a chat

The agent can change some settings for the rest of the session, through its `configure` tool. It can set the site if none was given, and it can make the limits stricter (fewer tools, more privacy), but never looser than your configuration. For example:

> For this chat, work only with course content, nothing about students.

## Sharing the session with moodle-driver

If you also use the `moodle` command line from [moodle-driver](https://falkenslab.github.io/moodle-driver/), both can share one login: point `MOODLE_MCP_PROFILE_DIR` at the command line's profile for your site, `~/.moodle-driver/sites/<host>/profiles/<account>`. A profile can only be open in one browser at a time, so the two can't use it at the same moment.
