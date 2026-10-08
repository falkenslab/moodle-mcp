# ADR-001: playwright-core with the system's browser

## Decision

The server depends on `playwright-core`, not `playwright`, and launches the browser already installed on the machine (`channel: "msedge"` or `"chrome"`). Later, when neither is found, it may download Chromium on first start with `playwright-core`'s own installer, into `PLAYWRIGHT_BROWSERS_PATH` when set.

## Motivation

`playwright` downloads browsers in a `postinstall` script, and whoever installs this server (agent-kit installs plugins and their servers) never runs install scripts. `playwright-core` has no install script. Edge ships with Windows and Chrome is on most machines, so using them avoids a ~150 MB download in the common case.

## Consequences

- Requirements: Node plus Edge or Chrome, or an internet connection for the first start. The channel is configurable (`msedge`, `chrome`, `chromium`); by default the server tries Edge, then Chrome, then the downloaded Chromium.
- The browser's version is whatever the machine has; Playwright supports the current stable channels.
- With no system browser, the first browser use starts `playwright-core`'s CLI (`install chromium --no-shell --no-remove`) in the background, its output on stderr: `--no-shell` because full Chromium also runs headless (channel `chromium`), `--no-remove` because the browser cache is shared with other Playwright installations. Tool calls meanwhile answer at once that it's downloading and to retry, since a download (about 45 s for 180 MB, confirmed empirically) can outlast a client's timeout. `MOODLE_MCP_DOWNLOAD_BROWSER=false` turns it off. On Linux, Chromium may still need system libraries that only `install-deps` (root) adds; the server doesn't run it.
