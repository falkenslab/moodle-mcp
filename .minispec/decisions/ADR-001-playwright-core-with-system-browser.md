# ADR-001: playwright-core with the system's browser

## Decision

The server depends on `playwright-core`, not `playwright`, and launches the browser already installed on the machine (`channel: "msedge"` or `"chrome"`). Later, when neither is found, it may download Chromium on first start with `playwright-core`'s own installer, into `PLAYWRIGHT_BROWSERS_PATH` when set.

## Motivation

`playwright` downloads browsers in a `postinstall` script, and whoever installs this server (agent-kit installs plugins and their servers) never runs install scripts. `playwright-core` has no install script. Edge ships with Windows and Chrome is on most machines, so using them avoids a ~150 MB download in the common case.

## Consequences

- Requirements: Node plus Edge or Chrome. The channel is configurable; by default the server tries Edge, then Chrome.
- The browser's version is whatever the machine has; Playwright supports the current stable channels.
- With no browser at all, the server fails with a clear message until the Chromium download exists (`features/chromium-download.md`).
