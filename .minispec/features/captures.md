# Screenshots of each action, for the person only

Issue: [#55](https://github.com/falkenslab/moodle-mcp/issues/55)

## Goal

With a setting on, moodle-mcp saves a picture of the Moodle page each tool leaves behind, for the person (an agent's own app shows it under its step), never for the model.

## Context

- Requested for miyagi's web chat (falkenslab/miyagi#77, its `classroom-captures` card): it moves each capture into the conversation's folder, out of the agent's reach, and shows it under the step that made it.
- A screenshot can't be redacted (ADR-017): it may show students' names, grades and posts, so it never goes in a tool's reply. Under `pseudonymize` the person still sees real names in their own captures, as in their own browser.
- Tools are wrapped in `createServer` (pseudonymize, explainErrors, follow, classrooms, confirm, scopes): a capture wrapper fits there, with no tool changing.
- No page is left behind: each driver function opens its own tab (`openSitePage`) and closes it when done. The page it worked on reaches only the driver's internal follower (`followPages`, set by the browser manager), which shows it in the working tab only while a window is visible (`show()` does nothing headless). So, headless, this server can't see nor learn the page a tool worked on: **this needs moodle-driver first** (a hook that gets each page before the driver closes it: falkenslab/moodle-driver#94).
- AJAX-only tools open no page: their page comes from the follow map (ADR-011, `src/tools/follow.ts`, or the driver's `FOLLOWED_PAGES`), and capturing it means loading it in the working tab (`browser.tab()`), one more page view in Moodle's logs.
- The data folder is `config.dataDir` (`CLAUDE_PLUGIN_DATA`, else `~/.moodle-mcp`). `browser_screenshot` is the only tool that returns an image today, and only under `clear`.

## Changes

- Settings `MOODLE_MCP_CAPTURES` / `--captures`: `off` (the default), `changes` (after every tool with `readOnlyHint: false`, the `browser_*` tools that click or type included) or `all` (after every tool that leaves a page); and `MOODLE_MCP_CAPTURES_DIR`, else `<dataDir>/captures`. In `configure`, `server_info` and the usage text.
- A wrapper that, for each page the driver hands over before closing it (the last one of the tool), or the AJAX tool's page loaded in the working tab, saves the viewport as `<epoch ms>-<tool>.jpg` (1280 px wide, JPEG quality about 60) and a `.json` beside it with the tool, the page's URL and title, and the time. It never opens the browser for that, and a failed capture never fails the tool nor changes its reply.
- An ADR: captures of others' data written to disk for the person, never for the model.
- Docs, English and Spanish: settings (both), privacy (what a capture may hold, where it is, that the agent mustn't read that folder: a `Read` deny like pseudonym's).

## Acceptance

- Tests: with `off` no file is written; with `changes` a read tool writes nothing and a write leaves one capture with its `.json`; replies are identical with captures on and off; a failing screenshot leaves the tool's result unchanged.
- The sandbox's course 3: hiding a label with `changes` leaves a picture of the course page.
