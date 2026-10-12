# get_submissions may create empty submissions just by reading

Issue: [#10](https://github.com/falkenslab/moodle-mcp/issues/10)

## Problem

Two `get_submissions` calls minutes apart (sandbox, assignment 35, as the teacher), nobody submitting in between: participants went from `none` to `new`, and the logs show "Grading form viewed" by the teacher. A read-only tool is creating submission records and leaving a trail.

## Cause

Likely in moodle-driver: `assignmentSubmissions` reads each participant's content through `gradingPanelHtml` (`core_get_fragment`, the grader's panel), and Moodle's grading panel creates an empty submission for a participant without one. The second call had `includeContent: false`, so other reads (`mod_assign_get_participant`?) may do it too: to confirm.

## Solution

An issue in moodle-driver: read submissions without creating records (the submission status from `mod_assign_get_submissions` or the grading table, the panel only for those with a submission), or say it does. Here: if it can't be avoided, `get_submissions`' description and read-only annotation say so (it would leave `MOODLE_MCP_ACCESS=read`).

## Verification

In the sandbox, two `get_submissions` in a row leave every participant's status and the logs as they were.
