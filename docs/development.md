# Developing moodle-mcp

All the Moodle work is in [@falkenslab/moodle-driver](https://www.npmjs.com/package/@falkenslab/moodle-driver), and pseudonymization in [@falkenslab/pseudonym](https://www.npmjs.com/package/@falkenslab/pseudonym); both come from npm and are bundled into the server. A change to how Moodle is read or written goes to the driver's repository (a release there, then a version bump here); a tool here is a schema, a description and one driver call.

The design and its decisions are in [.minispec/](../.minispec/README.md); the candidate tools and their status in [tool-catalog.md](tool-catalog.md).

## Commands

```bash
npm install
npm run build       # bundles src/ into dist/server.mjs
npm run dev         # rebuilds on every change
npm run typecheck
npm run lint
npm run test:docker # every test, in a container with Playwright's Chromium: nothing opens on your desktop
```

The tests launch browsers: run them in Docker. `npm test` runs them on your machine, with windows on your desktop.

`test:docker` runs `scripts/in-docker.mjs`, which wraps any command the same way: Playwright's image, the repository mounted with Linux `node_modules` of its own, an npm cache volume, no display, and, when the Moodle sandbox is up, its network, with `localhost:8080` forwarded to it. One test file:

```bash
node scripts/in-docker.mjs npx tsx --test test/tools/scopes.test.ts
```

From Git Bash on Windows, prefix it with `MSYS_NO_PATHCONV=1` so paths reach the container as written.

## Trying the server by hand

The MCP Inspector opens a web UI on the built bundle (set `MOODLE_URL` in your shell first):

```bash
npm run inspect
```

Or from the command line, listing the tools with a schema portability check (it must report no warnings) and calling one:

```bash
npx @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/list --strict
npx @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/call --tool-name server_info
```

## A Moodle to test against

[moodle-sandbox](https://github.com/falkenslab/moodle-sandbox) runs one in Docker at `http://localhost:8080`, with test courses and teacher and student accounts. Course 3 (`mcp-content`) is for changes; course 2 (`sandbox-course`) is read-only, as other projects' tests depend on it. Log in with its accounts in the browser the server opens; never put credentials in code, tests or docs.

## Adding a tool

1. The Moodle side is a moodle-driver function, released there first.
2. One file in `src/tools/` (or a small family), registered in `src/tools/index.ts`, its driver functions listed in `TOOL_FUNCTIONS` (`src/tools/scopes.ts`): that decides which scope it needs.
3. A tool that shows other people goes through `src/people.ts`: aliases under `pseudonymize`, redacted text, aliases refused in text written to Moodle.
4. A test against the driver's fake Moodle, the `--strict` check, and the README's tool table.

The Claude Code skills in `.claude/skills/` (`add-tool`, `verify`, `sandbox-check`, `update-docs`…) hold the full checklists.
