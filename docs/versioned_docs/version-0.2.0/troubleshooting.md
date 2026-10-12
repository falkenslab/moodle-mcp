---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

## The AI app doesn't list moodle-mcp

- **Check Node.js.** In a terminal, `node --version` must print `v20` or higher. If you just installed Node.js, restart the AI app (on Windows, sign out and in again if it still isn't found).
- **On Windows, use `cmd /c`.** The command must be `cmd` with arguments `/c npx -y @falkenslab/moodle-mcp`, as in the [Claude Code](./getting-started/claude-code.md), [Claude Desktop](./getting-started/claude-desktop.md) and [Codex](./getting-started/codex.md) guides.
- **Claude Desktop: check the file.** A missing comma or quote in `claude_desktop_config.json` stops every server from loading. Paste the file into a JSON checker, fix it, and restart Claude Desktop completely.
- **Codex: give it time.** The first start downloads moodle-mcp. Set `startup_timeout_sec = 120` as in the [Codex guide](./getting-started/codex.md#3-give-it-time-to-start).
- **Look at the logs.** In Claude Code, `claude mcp list` and the `/mcp` command show the error. Claude Desktop writes logs to `%APPDATA%\Claude\logs` (Windows) or `~/Library/Logs/Claude` (macOS), in `mcp-server-moodle.log`.

## A login window keeps coming back

- Log in in the window that opens, and wait for it to close by itself. It waits 5 minutes for you.
- If it opens again on every request, your site may end sessions when the browser closes. Tick *Remember me* on the login page, if your site has it.
- After updating moodle-mcp, a profile may need one more login, because the browser library sometimes changes where it keeps the session.

## "Downloading a browser"

There's no Edge or Chrome on your computer, so moodle-mcp is fetching Chromium (about 180 MB), once. Try again in a minute or two. To use a browser you already have, set `MOODLE_MCP_CHANNEL`.

## No window can open

On a server or in a container without a screen, the login window can't open. Log in on a computer with a screen, and copy that profile folder (`~/.moodle-mcp/profile`) to the server, or point `MOODLE_MCP_PROFILE_DIR` at it.

## The profile is in use

Another program has the profile open: a second AI app with moodle-mcp, or moodle-driver's command line. Close it, or give each one its own profile with `MOODLE_MCP_PROFILE_DIR`.

## The agent says it can't do something

- **A tool may be left out by your limits.** Ask the agent for moodle-mcp's current limits, and compare with [Limiting the agent](./limits.md).
- **Your Moodle account may not be allowed.** moodle-mcp can only do what your account can do in Moodle. Try the same thing in your browser.
- **Students' data may be blocked or pseudonymized.** Some things, like files students submitted, need `clear`. See [Students' privacy](./privacy.md).

## A tool takes too long, or times out

Some Moodle tasks are slow: a course backup, importing many questions, grading many submissions. Activities done as a student go at a reader's pace on purpose ([`MOODLE_MCP_TRAIL`](./settings.md)). In Codex, raise `tool_timeout_sec`. In Claude Code, set the `MCP_TOOL_TIMEOUT` environment variable (in milliseconds) before starting it.

## Something else

Please [open an issue](https://github.com/falkenslab/moodle-mcp/issues) with what you asked, what happened, and your Moodle version. Leave out names and anything about your students.
