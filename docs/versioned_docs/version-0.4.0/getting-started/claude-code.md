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

## Changing or removing it

To change a setting, remove the server and add it again with the new values:

```bash
claude mcp remove moodle --scope user
```

To use a specific version instead of the latest, write it after the package name: `@falkenslab/moodle-mcp@0.1.0`.
