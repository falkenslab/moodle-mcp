# Edge doesn't start on a long profile path, and the error doesn't say so

Issue: [#58](https://github.com/falkenslab/moodle-mcp/issues/58)

## Problem

With a long data folder, the browser fails to launch with `browser has been closed`, for a profile under `<data>/.miyagi/extensions/.data/moodle-teacher/profile`; a much shorter path works. The length wasn't measured. With no hint in the error, the agent called `configure` to move the profile to a temporary folder, which nobody asked for.

## Cause

The driver rethrows the launch failure as it comes (falkenslab/moodle-driver#98). `configure` takes `profileDir` from the agent like any other setting, with no question to the person. The issue calls the change persistent, while `configure`'s code says it's for the session: to check when this is worked on.

## Solution

**Needs moodle-driver first** (falkenslab/moodle-driver#98) for the error. Then the driver bump and a line in `src/tools/errors.ts` that tells the agent to ask the person. Here, decide with the owner whether the agent keeps `profileDir` in `configure`, or the person is asked first (ADR-023).

## Verification

A test of the explained error, and of `configure` under whichever rule is chosen; a launch on a long path on Windows.
