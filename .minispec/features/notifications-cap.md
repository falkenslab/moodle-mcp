# list_notifications may be cut at 120 without saying so

Issue: [#13](https://github.com/falkenslab/moodle-mcp/issues/13)

## Problem

`list_notifications` with `unreadOnly: true` returned exactly 120 notifications, all from the last 18 hours: a round number that suggests a cap the result doesn't report.

## Cause

To find out. The driver asks `message_popup_get_popup_notifications` with `limit: 0` (all); whether Moodle caps that call, or there were exactly 120, is to be checked in the sandbox (more than 120 notifications for one user).

## Solution

If Moodle cuts: the driver pages through them, or says so (an issue in moodle-driver), and the tool reports it (`truncated`, a total) and its description gives the limit. Together with #12's paging.

## Verification

A user with more notifications than the cap: the tool gives them all, or says it cut them.
