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
