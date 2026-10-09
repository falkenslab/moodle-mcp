---
name: sandbox-check
description: Check moodle-mcp against the real Moodle of ../moodle-sandbox, in Docker - a scratch MCP client script calling the built server as the sandbox's teacher or student, on profiles kept in the scratchpad, never on the developer's desktop and never with credentials in files that stay. Use after changing a tool that writes, or that reads what the fake Moodle can't stand for, and to reproduce a bug seen on a real site.
---

# Check against the Moodle sandbox

## 1. Preconditions

- The sandbox is up: `docker ps` shows `moodle-sandbox-webserver-1` (start it from `../moodle-sandbox` with its own commands if not, after asking the owner). It answers at `http://localhost:8080` inside the test container: `scripts/in-docker.mjs` joins its network and forwards the port.
- The server is built (`npm run build`, after `../moodle-driver` is built).
- Courses: **course 3** (`mcp-content`) is ours to change. **Never change course 2** (`sandbox-course`) or its activities: other agents' tests depend on it; read-only checks there are fine.

## 2. The script

Write it in the session's scratchpad under `docker/` (never in the repo), as a plain `.mjs` MCP client of the built server:

```js
import { Client } from "/work/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "/work/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
const client = new Client({ name: "check", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["/work/dist/server.mjs", "--url", "http://localhost:8080", "--profile-dir", "/scratch/profile-teacher", "--channel", "chromium", "--trail", "fast"], env: { ...process.env }, stderr: "ignore" }));
// client.callTool({ name, arguments }, undefined, { timeout: 120_000 }) ... then client.close()
```

- `env: { ...process.env }`: the SDK's default environment drops `PLAYWRIGHT_BROWSERS_PATH`, and the server then downloads Chromium instead of using the image's.
- Use the Write tool for scripts: shell heredocs and quotes break on Windows paths, backslashes and `$`.

## 3. Run it

```
S="<scratchpad>/docker"
MOODLE_MCP_DOCKER_MOUNT="$(cygpath -w "$S"):/scratch" MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs bash -c "rm -f /scratch/profile-*/Singleton*; node /scratch/<script>.mjs; echo leftovers: \$(ps -eo args | grep -ciE '[c]hrom')"
```

- `rm -f /scratch/profile-*/Singleton*`: a container that died leaves Chromium's profile lock behind.
- The container has no display: a tool that asks for a window (`login`, `show_browser`) fails with the no-screen error, as designed. To watch a headed flow, run inside `xvfb-run -a` (a virtual display in the container), never on the desktop.

## 4. Profiles and logging in

- `profile-teacher` (`profesor`) and `profile-student` (`alumno`) in the scratchpad's `docker/` keep their sessions between checks; reuse them.
- To log one in (or a seeded student, `lucia.martin`…, for checks that end a session, such as `logout`): get the accounts with `npm run --silent info -- --json` in `../moodle-sandbox`, write only the one needed to `<scratchpad>/docker/creds.json`, run the scratch login script on its own profile, and **delete `creds.json` right after** (check it's gone). Never print credentials, never put them in the repo, tests, docs or commit messages.

## 5. Report

What ran, per call ✓/✗ with the gist of the result, which failures are data (an activity outside the course's state, a course without a grade report) and which are code, and that nothing was left running. Data you created in course 3 stays (note it); undo it only if the owner asks.
