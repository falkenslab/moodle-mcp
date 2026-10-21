---
title: Set up Claude Code
sidebar_label: Claude Code
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Set up Claude Code

[Claude Code](https://claude.com/claude-code) is Claude in your terminal, or in VS Code and other editors. If you don't have it yet, follow [its installation guide](https://docs.claude.com/en/docs/claude-code/setup) first.

## 1. Add moodle-mcp

Open a terminal and run this command, with **your Moodle site's address** instead of `https://campus.example.org`:

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS and Linux" default>

<Terminal title="Terminal">{`
$ claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: npx -y @falkenslab/moodle-mcp to user config
`}</Terminal>

</TabItem>
<TabItem value="windows" label="Windows">

<Terminal title="PowerShell" prompt="PS>">{`
PS> claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- cmd /c npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: cmd /c npx -y @falkenslab/moodle-mcp to user config
`}</Terminal>

On Windows, `npx` is started through `cmd /c`.

</TabItem>
</Tabs>

What each part means:

- `moodle` is the name you give the server. The tools show up in Claude as `moodle` tools.
- `--scope user` makes it available in every folder you open Claude Code in. Leave it out to add it only to the current folder.
- `-e MOODLE_URL=…` is your site. You can leave it out, and Claude will ask you for the site the first time.
- `npx -y @falkenslab/moodle-mcp` downloads and starts the latest version.

## 2. Check it's there

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS and Linux" default>

<Terminal title="Terminal">{`
$ claude mcp list
Checking MCP server health…

moodle: npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

</TabItem>
<TabItem value="windows" label="Windows">

<Terminal title="PowerShell" prompt="PS>">{`
PS> claude mcp list
Checking MCP server health…

moodle: cmd /c npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

</TabItem>
</Tabs>

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

## Other ways to add it

### From inside Claude Code: the plugin

Falken's Lab's marketplace has moodle-mcp as a Claude Code plugin, with skills that say how to do each job well: **moodle-teacher** for the courses you teach, **moodle-student** for those you take. In Claude Code:

```text
/plugin marketplace add falkenslab/agent-extensions
/plugin install moodle-teacher@falkenslab
```

It asks for your Moodle sites (`name=address`, such as `school=https://campus.myschool.org`), whether the browser works out of sight, read-only access and how students' data arrives. Change them later in `/plugin`. The same from a terminal: `claude plugin marketplace add falkenslab/agent-extensions`, then `claude plugin install moodle-teacher@falkenslab`.

Use the plugin or the server added in step 1, not both: they would be two copies of the same tools.

### By hand: the configuration file

Claude Code reads its servers from two files:

- `.mcp.json` in a project's folder: only there, and it can go in the project's repository. Claude Code asks you to trust it the first time;
- `~/.claude.json` (`%USERPROFILE%\.claude.json` on Windows), under `mcpServers`: every folder. That's where `--scope user` writes.

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS and Linux" default>

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

</TabItem>
<TabItem value="windows" label="Windows">

```json title=".mcp.json"
{
  "mcpServers": {
    "moodle": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@falkenslab/moodle-mcp"],
      "env": { "MOODLE_URL": "https://campus.example.org" }
    }
  }
}
```

</TabItem>
</Tabs>

Other [settings](../settings.md) go in `env`. Claude Code reads the file when it starts, or when you reconnect the server in `/mcp`.

## Changing or removing it

To change a setting, edit its `env` in the file, or remove the server and add it again with the new values:

```bash
claude mcp remove moodle --scope user
```

A plugin's settings change in `/plugin`, and `/plugin uninstall moodle-teacher@falkenslab` removes it.

To use a specific version instead of the latest, write it after the package name: `@falkenslab/moodle-mcp@0.1.0`.
