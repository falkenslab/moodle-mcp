---
title: Set up Claude Desktop
sidebar_label: Claude Desktop
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Set up Claude Desktop

[Claude Desktop](https://claude.ai/download) is the Claude app for Windows and macOS. You add moodle-mcp to its configuration file once.

## 1. Open the configuration file

1. Open Claude Desktop.
2. Go to **Settings** (on Windows, the menu ☰ → *File* → *Settings*; on macOS, *Claude* → *Settings*).
3. Choose **Developer** and click **Edit Config**.

This opens the folder with `claude_desktop_config.json`. Open that file with a text editor (Notepad, TextEdit, VS Code…). It's at:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## 2. Add moodle-mcp

Paste this into the file, with **your Moodle site's address** instead of `https://campus.example.org`:

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS" default>

```json
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

```json
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

If the file already has other servers under `mcpServers`, add the `"moodle": { … }` block next to them, with a comma between blocks.

Other [settings](../settings.md) go in `env` too. For example, a teacher who wants only the teacher's tools:

```json
"env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ROLE": "teacher" }
```

## 3. Restart Claude Desktop

Quit Claude Desktop completely (on Windows, also from the icon next to the clock) and open it again. In a new chat, the **tools** button (the sliders icon under the message box) now lists `moodle` with its tools.

If it isn't there, or shows an error, see [Troubleshooting](../troubleshooting.md): the most common cause is a missing comma or quote in the file.

## 4. Try it

In a new chat, ask:

> List my Moodle courses.

Claude asks your permission the first time it uses each tool: choose *Allow once* or *Allow always*. Then a browser window opens at your Moodle login page: log in as usual. See [Logging in the first time](./first-login.md).
