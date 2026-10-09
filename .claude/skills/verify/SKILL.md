---
name: verify
description: Run moodle-mcp's full quality gate (the sibling moodle-driver's build up to date, typecheck, lint, build, every test in Docker, the Inspector's --strict schema check, nothing left running) and report the result. Use before committing, before a release, and after any change under src/, test/ or scripts/.
---

# Verify moodle-mcp

Run from the repo root (Git Bash; prefix Docker commands with `MSYS_NO_PATHCONV=1`), in this order, stopping at the first failure and reporting it:

```
ls ../moodle-driver/dist/index.js                     # the driver is built (file:../moodle-driver)
npm run typecheck
npm run lint
npm run build
MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs npm test
MSYS_NO_PATHCONV=1 node scripts/in-docker.mjs bash -c "timeout 240 npx -y @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/list --strict >/tmp/o 2>/tmp/e; echo exit=\$? warnings=\$(grep -ci warn /tmp/e) tools=\$(grep -c '\"name\": \"' /tmp/o)"
```

Notes:
- **Never run `npm test` on the host**: the tests launch browsers, which must never open on the developer's desktop (owner's rule). Always through `scripts/in-docker.mjs`, which gives the container no display.
- The driver comes from `../moodle-driver`'s `dist/`. If its `src/` is newer than its `dist/` (`git -C ../moodle-driver status`, or the dates), it needs `npm run build` there first; that's the driver's repository: build it, never edit it from this session.
- Tests must report `fail 0`; quote the pass/fail counts. The `--strict` check must say `exit=0 warnings=0`; quote the tool count.
- The Inspector downloads through `npx` into a cached volume (`moodle-mcp-npm-cache`); a first run on a slow network can take minutes. A timeout there is the network, not the server: check with a plain `npm view` inside the container before blaming the code.
- After anything that ran against the sandbox or launched browsers, check nothing is left: in the container, `ps -eo args | grep -iE '[c]hrom|[n]ode .*server.mjs'` (lines of the container's own `bash -c` contain "server.mjs" too; ignore those); on Windows, no `msedge`/`chrome` from Playwright and no `node … server.mjs` (`Get-CimInstance Win32_Process`, outside the sandbox). Blank Moodle-titled Alt+Tab entries with no process behind are stale WSLg ghosts: restarting the Windows Explorer clears them.
- Never "fix" a failure by weakening a rule, skipping a test or adding `any`. Find the cause; if the fix is out of scope (the driver, pseudonym), report it instead.

Report only: what ran, pass/fail per step, the counts, and the exact error for any failure.
