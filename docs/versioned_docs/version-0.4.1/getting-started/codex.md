---
title: Set up Codex
sidebar_label: Codex
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Set up Codex

[Codex](https://developers.openai.com/codex) is OpenAI's coding agent, in your terminal (Codex CLI), in VS Code and in the Codex app. They all share the same configuration, so you add moodle-mcp once.

## 1. Add moodle-mcp

Open a terminal and run this command, with **your Moodle site's address** instead of `https://campus.example.org`:

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS and Linux" default>

<Terminal title="Terminal">{`
$ codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added global MCP server 'moodle'.
`}</Terminal>

</TabItem>
<TabItem value="windows" label="Windows">

<Terminal title="PowerShell" prompt="PS>">{`
PS> codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- cmd /c npx -y @falkenslab/moodle-mcp
Added global MCP server 'moodle'.
`}</Terminal>

</TabItem>
</Tabs>

## 2. Check it's there

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS and Linux" default>

<Terminal title="Terminal">{`
$ codex mcp list
Name    Command  Args                          Env               Cwd  Status   Auth
moodle  npx      -y @falkenslab/moodle-mcp     MOODLE_URL=*****  -    enabled  Unsupported
`}</Terminal>

</TabItem>
<TabItem value="windows" label="Windows">

<Terminal title="PowerShell" prompt="PS>">{`
PS> codex mcp list
Name    Command  Args                              Env               Cwd  Status   Auth
moodle  cmd      /c npx -y @falkenslab/moodle-mcp  MOODLE_URL=*****  -    enabled  Unsupported
`}</Terminal>

</TabItem>
</Tabs>

`enabled` means Codex will start it. It starts it for real the first time you open a session.

## 3. Give it time to start

Codex waits 10 seconds for a server to start, and 60 seconds for a tool to finish. The first start downloads moodle-mcp, and some Moodle tasks take longer than a minute (a course backup, a quiz with many questions), so give it more room. Open Codex's configuration file:

- **Windows**: `%USERPROFILE%\.codex\config.toml`
- **macOS and Linux**: `~/.codex/config.toml`

`codex mcp add` wrote a `[mcp_servers.moodle]` section there. Add the two timeout lines to it (on Windows, `command` is `"cmd"` and `args` start with `"/c", "npx"`):

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.moodle.env]
MOODLE_URL = "https://campus.example.org"
```

Other [settings](../settings.md) go under `[mcp_servers.moodle.env]`, such as `MOODLE_MCP_ROLE = "teacher"`.

## 4. Try it

Start Codex (`codex` in a terminal) and ask:

> List my Moodle courses.

The first time, a browser window opens at your Moodle login page: log in as usual. See [Logging in the first time](./first-login.md). Inside Codex, `/mcp` lists the servers and their tools.

## Approving tool calls

Codex asks you before each moodle-mcp tool that changes something in Moodle. To let it run moodle-mcp's tools without asking, add this line to the `[mcp_servers.moodle]` section:

```toml
default_tools_approval_mode = "approve"
```

Do this only if you're comfortable with the agent changing Moodle without asking first. It's safer together with read-only access (`MOODLE_MCP_ACCESS = "read"`, see [Limiting what the agent can do](../limits.md)).

:::note `codex exec`
In non-interactive runs (`codex exec`), nobody can answer the approval question, so Codex cancels tools that change Moodle unless you set `default_tools_approval_mode` as above.
:::
