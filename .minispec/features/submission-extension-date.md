# get_submissions: the extension's date

Issue: [#11](https://github.com/falkenslab/moodle-mcp/issues/11)

## Goal

A participant with `extensionGranted` comes with the date the extension runs to.

## Context

- The driver gives it (`Submission.extensionDueDate`), but `get_submissions` leaves it out since it picks its fields one by one (moodle-driver 0.5.1 adaptation, a73e420): a slip here, not in the driver.
- Seen in the sandbox, assignment 35: one participant with an extension, `dueDate` the same as everyone's.

## Changes

- `extensionDueDate` (ISO 8601) in `get_submissions`' output and schema, described with `dueDate`.
- A test with a participant who has an extension.

## Acceptance

- In the sandbox, the participant given an extension on assignment 35 comes with its date.
