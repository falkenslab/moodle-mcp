# Chromium download when no browser is installed

## Goal

When neither Edge nor Chrome is installed, the server downloads Chromium on its first browser use with `playwright-core`'s own installer and uses it (ADR-001).

## Context

- Today `browser.ts` throws `BrowserNotFoundError` after trying `msedge` and `chrome`.
- `playwright-core` ships the installer (its CLI: `install chromium`) and the browser revisions it expects (`browsers.json`); it downloads into `PLAYWRIGHT_BROWSERS_PATH` when set, else the user's `ms-playwright` cache. No install script is involved, so it fits ADR-001.
- A download takes minutes, longer than some clients wait for a tool call. On Linux, Chromium may also need system libraries that only `install-deps` (root) adds.
- How the installer is located depends on `features/bundle-playwright-core.md`.

## Changes

- `browser.ts`: after every channel is missing, run the installer for Chromium once (concurrent callers wait on the same download), with its output on stderr, never stdout; then launch the downloaded Chromium (no channel).
- A setting to turn it off (`MOODLE_MCP_DOWNLOAD_BROWSER=false`) and `chromium` as a value of `MOODLE_MCP_CHANNEL` to force it.
- While downloading, a tool call answers that the browser is being installed and to retry, instead of hanging past the client's timeout; MCP progress notifications if the client asks for them.
- `server_info`: show `chromium` as the open channel and where it was installed.
- Tests: the fallback order and the single download with a fake launcher and installer.

## Acceptance

- With the system browsers out of reach (channel forced to a missing one) and `PLAYWRIGHT_BROWSERS_PATH` at an empty folder: the first browser use downloads Chromium there and opens the sandbox; the next start doesn't download again.
- With the download turned off, the error is today's, naming the setting.
- Nothing is written to stdout during the download.
