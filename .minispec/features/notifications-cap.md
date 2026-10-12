# list_notifications may be cut at 120 without saying so

Issue: [#13](https://github.com/falkenslab/moodle-mcp/issues/13)

## Problem

`list_notifications` with `unreadOnly: true` returned exactly 120 notifications, all from the last 18 hours: a round number that suggests a cap the result doesn't report.

## Cause

No cap: the driver asks `message_popup_get_popup_notifications` with `limit: 0`, which in Moodle 5.x returns them all (checked in its code, 12 October 2026), and filters the unread ones afterwards. The 120 were most likely all there were (the sandbox's test suites send many).

## Solution

Paging, with #12: falkenslab/moodle-driver#55 (limit, offset, whether there are more); then `list_notifications` takes them and says when there are more, and this issue closes with #12.

## Verification

A user with more notifications than the cap: the tool gives them all, or says it cut them.
