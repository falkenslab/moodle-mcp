# moodle-mcp

An [MCP](https://modelcontextprotocol.io) server that works a Moodle site through a real browser. It drives the Edge or Chrome already installed on your machine with Playwright and exposes Moodle tasks as tools (`list_courses`, `list_assignments`, `get_submissions`…), never generic clicks and keystrokes. Any MCP client can use it: Claude Code, Claude Desktop or your own agent.

You log in yourself, in a browser window the server opens: it never sees or stores your password. Your session is kept in a browser profile folder outside the server.

Status: early development. Today it has `login` and `server_info`; the Moodle tools come one by one.

## Requirements

- Node.js 20 or later.
- Microsoft Edge or Google Chrome installed.

## Configuration

Each setting is an environment variable or a command-line argument; the argument wins.

| Variable | Argument | Default | Meaning |
| --- | --- | --- | --- |
| `MOODLE_URL` | `--url` | (required) | The Moodle site, e.g. `https://campus.example.org` |
| `MOODLE_MCP_PROFILE_DIR` | `--profile-dir` | `~/.moodle-mcp/profile` | Browser profile folder that keeps your session; it can't be inside the server's folder |
| `MOODLE_MCP_CHANNEL` | `--channel` | Edge, then Chrome | Browser to use: `msedge` or `chrome` |
| `MOODLE_MCP_HEADLESS` | `--headless` / `--headed` | `true` | Run the browser without a window (logging in always shows one) |

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

Claude Desktop takes the same `mcpServers` entry in its `claude_desktop_config.json`. Ask the client to call `server_info` to check the configuration it's running with.

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
