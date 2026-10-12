# get_submissions' status "new" isn't documented

Issue: [#9](https://github.com/falkenslab/moodle-mcp/issues/9)

## Problem

`get_submissions` returns `status: "new"`, which its description doesn't list (it names submitted, draft and none), so a client can't tell `new` from `none`.

## Cause

Moodle's own statuses include `new`: a submission record exists, nothing submitted yet; `none` is the driver's word for no record at all. The tool passes Moodle's status through. Partly a consequence of #10: reading creates the records that make `none` turn into `new`.

## Solution

To decide when reviewing: document `new` in the description and the schema ("a submission started or created, nothing submitted"), or map `new` to `none` for the client. Revisit once #10 is settled.

## Verification

A test with a participant whose submission is `new`; the description lists every status the tool can give.
