# show_browser(true) loses the Moodle session

Issue: [#3](https://github.com/falkenslab/moodle-mcp/issues/3)

## Problem

In a Claude Code session on Windows (11 October 2026, driver 0.4.x, Edge), after `show_browser({ visible: true })` the next tool said there was no Moodle session, and the person had to log in again.

## Cause

Unknown. Not reproduced on 12 October 2026 with moodle-driver 0.5.1 in Docker (Chromium under xvfb): the session held across showing and hiding. Suspects: the switch from a headless to a headed Edge on Windows not carrying the session cookies, or a 0.4 bug the driver's 0.5 session handling fixed.

## Solution

Pending: retried in `examples/moodle-mcp-test` on Windows with Edge and the current build. If it doesn't fail, the issue is closed; if it does, the switch is investigated there, and the fix likely belongs to moodle-driver's `BrowserManager` (an issue there).

## Verification

The issue's steps on Windows with Edge: a tool after `show_browser(true)` and after `show_browser(false)` keeps the session.
