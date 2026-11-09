# A lost browser is reported as something else

Issue: [#57](https://github.com/falkenslab/moodle-mcp/issues/57)

## Problem

From miyagi's desktop app (moodle-mcp 0.8.0, Windows, headless Edge 157), Edge crashed repeatedly during long course builds; the trigger is unknown and it didn't reproduce outside the app. Tools then fail with `Target page, context or browser has been closed`, or hang until the client's limit, and `import_questions` answers that the activity has no question bank, so the agent told the teacher that Moodle rejects imports. From an extension the browser can't be chosen either.

## Cause

- The driver's `importQuestions` turns every `openForm` failure but a lost session into `QuestionBankError`, and a lost browser has no stable error code (falkenslab/moodle-driver#97, with the relaunch and retry).
- `src/tools/errors.ts` can only explain what has a code.
- `MOODLE_MCP_CHANNEL` isn't in moodle-teacher's manifest, and the launcher passes only declared variables: work for falkenslab/agent-extensions, no issue there yet.

## Solution

**Needs moodle-driver first** (falkenslab/moodle-driver#97). Then the driver bump, and a line in `src/tools/errors.ts` for the new code: the browser was lost, Moodle refused nothing, and a write may be half done.

## Verification

A test against the fake Moodle with the context closed during a call: the agent's message says the browser was lost. A sandbox check that kills the browser during `import_questions` on course 3.
