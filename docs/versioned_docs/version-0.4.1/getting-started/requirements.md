---
title: Before you start
sidebar_label: Requirements
---

# Before you start

You need three things on your computer: **Node.js**, a **browser** and an **AI app**. It takes a few minutes, and you do it once.

## 1. Node.js

moodle-mcp runs on [Node.js](https://nodejs.org), version 20 or later. To check if you have it, open a terminal (on Windows, *PowerShell*; on macOS, *Terminal*) and type:

<Terminal>{`
$ node --version
v24.11.0
`}</Terminal>

If it prints `v20` or higher, you're done. If it says the command isn't found, or prints a lower version:

- **Windows and macOS**: download the **LTS** installer from [nodejs.org](https://nodejs.org) and run it with the default options. Then close the terminal and open a new one.
- **Linux**: install it with your distribution's package manager, or with [nvm](https://github.com/nvm-sh/nvm).

Node.js includes `npx`, which your AI app uses to download and start moodle-mcp. You never install moodle-mcp by hand.

## 2. A browser

moodle-mcp works through a real browser, logged in as you. It uses **Microsoft Edge** or **Google Chrome** if you have one. Windows already includes Edge.

If you have neither, it downloads its own copy of Chromium (about 180 MB) the first time it needs a browser. You don't have to do anything.

:::tip
The browser it uses has its own profile, separate from your everyday browsing: your bookmarks, history and other sessions are never touched.
:::

## 3. An AI app

Any app that supports MCP servers works. These guides cover the most common ones:

| App | What it is | Guide |
| --- | --- | --- |
| **Claude Code** | Claude in your terminal or in VS Code | [Set up Claude Code](./claude-code.md) |
| **Claude Desktop** | The Claude app for Windows and macOS | [Set up Claude Desktop](./claude-desktop.md) |
| **Codex** | OpenAI's agent, in your terminal or in VS Code | [Set up Codex](./codex.md) |

## 4. Your Moodle site's address

Copy the address of your Moodle site from your browser, for example `https://campus.example.org`. Any page of the site works: moodle-mcp finds the site's root by itself.

:::note What about my password?
You don't give it to anyone. The first time the agent needs Moodle, a browser window opens at your site's login page, and you log in there as usual. See [Logging in the first time](./first-login.md).
:::
