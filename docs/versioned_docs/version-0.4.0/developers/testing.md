---
title: Testing
sidebar_label: Testing
---

# Testing

## Tests run in Docker

The tests open browsers. Run them in a container, so nothing opens on your desktop:

```bash
npm run test:docker
```

`test:docker` runs `scripts/in-docker.mjs`, which wraps any command the same way: Playwright's image, the repository mounted with Linux `node_modules` of its own, an npm cache volume, and no display. When the Moodle sandbox is up, it also joins its network, with `localhost:8080` forwarded to it. One test file:

```bash
node scripts/in-docker.mjs npx tsx --test test/tools/scopes.test.ts
```

From Git Bash on Windows, prefix it with `MSYS_NO_PATHCONV=1`, so paths reach the container as written.

`npm test` runs the same tests on your machine, with browser windows on your desktop.

Most tests run against the driver's **fake Moodle**, a small server that answers like Moodle's pages and services. They check each tool's inputs, outputs and limits, and that people come out as aliases.

## A real Moodle to test against

[moodle-sandbox](https://github.com/falkenslab/moodle-sandbox) runs Moodle in Docker at `http://localhost:8080`, with test courses and teacher and student accounts:

- Course 3 (`mcp-content`) is moodle-mcp's: change it freely.
- Course 2 (`sandbox-course`) is shared with other projects' tests: only read it.

Log in with its accounts in the browser the server opens. Never put credentials in code, tests or documentation.

Check new tools against the sandbox too, not only the fake Moodle: a field the driver returns that the tool's output schema lacks makes the call fail in a real client.

## Before a commit

```bash
npm run typecheck && npm run lint && npm run build && npm run test:docker
```

Plus the schema check from [Developing](./index.md#trying-the-server-by-hand): `tools/list --strict` must report no warnings.

## The documentation's screenshots

The use cases' screenshots are real: Claude Code and Codex, run in Docker in a web terminal against the sandbox, typed and photographed by Playwright, and Moodle's own pages with the result. `scripts/screenshots/` regenerates them:

```bash
MOODLE_MCP_SHOTS_STATE=<folder> node scripts/screenshots/run.mjs              # every use case, English then Spanish, then Moodle's pages
MOODLE_MCP_SHOTS_STATE=<folder> node scripts/screenshots/run.mjs --only grading --langs en
MOODLE_MCP_SHOTS_STATE=<folder> node scripts/screenshots/run.mjs --moodle-only
```

- The state folder stays outside the repository: `profile-teacher` and `profile-student`, logged in to the sandbox (the `sandbox-check` skill does it), and the sessions' transcripts, to compare with what a page says.
- The run copies your Claude Code and Codex credentials into it, read-only in the container, and deletes them when it ends, whatever happens. It changes only course 3: before each language's sessions, `seed.mjs` puts back the submission to grade and an unanswered forum question, and deletes that language's quiz and page.
- `scenarios.json` holds each use case's client, account, settings and turns in both languages.
- A new session can behave differently from the last one, being a real agent: read its transcript and update the page's text, never the image.
