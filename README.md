# moodle-mcp

An [MCP](https://modelcontextprotocol.io) server that works a Moodle site through a real browser. It drives the Edge or Chrome already installed on your machine with Playwright and exposes Moodle tasks as tools (`list_courses`, `list_assignments`, `get_submissions`…), never generic clicks and keystrokes. Any MCP client can use it: Claude Code, Claude Desktop or your own agent.

You log in yourself, in a browser window the server opens: it never sees or stores your password. Your session is kept in a browser profile folder outside the server.

Status: early development. Today it has `configure`, `login`, `get_me`, `list_courses`, `get_course_structure`, `get_activity_content`, `list_assignments`, `get_submissions`, `list_discussions`, `get_discussion`, `get_my_grades`, `list_pending`, `grade_submission`, `reply_to_post`, `create_discussion`, `create_activity`, `update_activity`, the course layout tools (`edit_activity`, `duplicate_activity`, `delete_activity`, `add_section`, `edit_section`, `delete_section`) and `server_info`; the Moodle tools come one by one.

## Requirements

- Node.js 20 or later.
- Microsoft Edge or Google Chrome installed. Without either, the server downloads Chromium (about 180 MB) the first time it needs a browser, into `PLAYWRIGHT_BROWSERS_PATH` or Playwright's usual cache.

## Configuration

Nothing is required at startup. There are two ways to configure the server, and they can be mixed:

- **At run time, by the client.** The `configure` tool sets the site (`url`: the site or any page of it, such as a course URL), `headless` and `profileDir` for the running server. It checks that the URL is a Moodle site and keeps everything in memory: the server writes no settings. When a tool needs the site and has none, it tells the client to call `configure`, so an agent can pass the values from its own configuration or ask you. This is how a plugin can ship the server with a fixed `.mcp.json`.
- **At startup, the standard way.** Environment variables or command-line arguments (the argument wins) give starting values, which `configure` can still change.

| Variable | Argument | Default | Meaning |
| --- | --- | --- | --- |
| `MOODLE_URL` | `--url` | none | The Moodle site, e.g. `https://campus.example.org` |
| `MOODLE_MCP_PROFILE_DIR` | `--profile-dir` | `~/.moodle-mcp/profile` | Browser profile folder that keeps your session; it can't be inside the server's folder |
| `MOODLE_MCP_CHANNEL` | `--channel` | Edge, then Chrome, then Chromium | Browser to use: `msedge`, `chrome` or `chromium` (the one the server downloads) |
| `MOODLE_MCP_HEADLESS` | `--headless` / `--headed` | `true` | Run the browser without a window (logging in always shows one) |
| `MOODLE_MCP_DOWNLOAD_BROWSER` | `--no-download-browser` | `true` | Download Chromium when no system browser is found |
| `MOODLE_MCP_TRAIL` | `--trail` | `realistic` | How student tools view and do things: `realistic` (real pages, human pace, so Moodle logs views and completion) or `fast` |

## Logging in

When a tool reports that there is no session, the client calls `login`: a browser window opens at the site's login page and the tool waits (5 minutes by default) until you log in there yourself, SSO included. The session is kept in the profile folder, together with `moodle-mcp-session-cookies.json` (Chromium forgets session cookies on close, so the server saves them), and survives restarts until Moodle ends it.

The profile holds a live Moodle session: treat it like a password and keep it out of shared folders and repositories.

## Use from Claude Code

Build it first (see Development), then add it with the CLI:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -- node /path/to/moodle-mcp/dist/server.mjs
```

Or share it with a project in its `.mcp.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "node",
      "args": ["/path/to/moodle-mcp/dist/server.mjs"],
      "env": {
        "MOODLE_URL": "https://campus.example.org",
        "MOODLE_MCP_PROFILE_DIR": "/path/outside/the/project/moodle-profile"
      }
    }
  }
}
```

Without `env`, the client configures it with `configure` the first time a tool needs the site. Claude Desktop takes the same `mcpServers` entry in its `claude_desktop_config.json`. Ask the client to call `server_info` to check the configuration it's running with and where each value came from.

## Development

```bash
npm install
npm run build       # bundles src/ into dist/server.mjs
npm run dev         # rebuilds on every change
npm run typecheck
npm run lint
npm test
```

To try the server by hand, the MCP Inspector opens a web UI on the built bundle (set `MOODLE_URL` in your shell first):

```bash
npm run inspect
```

Or from the command line, listing the tools (with a schema portability check) and calling one:

```bash
npx @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/list --strict
npx @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/call --tool-name server_info
```

For a real Moodle to test against, [moodle-sandbox](../moodle-sandbox) runs one in Docker with a test course and teacher and student accounts, at `http://localhost:8080`. Log in with its accounts in the browser the server opens; never put credentials in code, tests or docs.

The design and its decisions are in [.minispec/](.minispec/README.md).

## License

[MIT](LICENSE) © Falkenslab
