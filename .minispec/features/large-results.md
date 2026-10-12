# Results too large for a client

Issue: [#12](https://github.com/falkenslab/moodle-mcp/issues/12)

## Goal

`get_course_logs` and `list_notifications` give a client what it can take in one go, and a way to ask for more.

## Context

- In a test session, both returned about 61,000 characters (189 log entries; 120 notifications) and Claude Code had to save them to a file and filter them with jq.
- A log entry repeats `context` and `component`, and its English `description` adds little to `event`; `list_notifications` has no limit or paging.
- Related: #13 (is the list of notifications cut?).

## Changes

- `list_notifications`: `limit` (a sensible default) and `before` or `offset`, and whether there are more.
- `get_course_logs`: a leaner entry (`description` only when asked; repeated fields once), and maybe a summary mode (counts by person and event) for "did this student do anything?".
- What the driver needs for paging notifications, as an issue there.

## Acceptance

- The same calls as in the test session return a result a client takes whole, and say when there's more.
