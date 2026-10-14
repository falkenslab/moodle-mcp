<div align="center">

<img src="docs/static/img/logo.svg" alt="moodle-mcp logo: the m of Moodle plugged into a socket" width="112"/>

# moodle-mcp

**Let an AI agent work in your Moodle courses as you, with your own login.**<br/>
Your students stay anonymous to the AI, and you decide what it can do.

[![npm](https://img.shields.io/npm/v/@falkenslab/moodle-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/moodle-mcp)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![Moodle 5.x](https://img.shields.io/badge/Moodle-5.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](LICENSE)

**[Documentation](https://falkenslab.github.io/moodle-mcp/)** · [Documentación en español](https://falkenslab.github.io/moodle-mcp/es/)

</div>

moodle-mcp is an [MCP](https://modelcontextprotocol.io) server that gives an AI agent such as Claude or Codex about 140 tools for Moodle: grade with your rubrics, build a quiz from your questions, answer the forum, see what's due this week. It works through a real browser on your computer, logged in as you, on any Moodle 5 site: no web service tokens, no administrator, no plugin. You log in yourself, students reach the AI as aliases, and you choose which tools it gets.

## Quick start

You need [Node.js](https://nodejs.org) 20 or later. Then add it to your AI app, with your Moodle site's address:

```bash
# Claude Code
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp

# Codex
codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
```

On Windows, put `cmd /c` before `npx`. Then ask "List my Moodle courses": the first time, a browser window opens for you to log in.

Claude Desktop, settings, limits, privacy and real use cases with screenshots are on the **[documentation site](https://falkenslab.github.io/moodle-mcp/)**.

## Developing

See [Developing moodle-mcp](https://falkenslab.github.io/moodle-mcp/developers) for building, tests in Docker and the Moodle sandbox, and [.minispec/](.minispec/README.md) for the design decisions.

## License

[MIT](LICENSE) © Falkenslab

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
