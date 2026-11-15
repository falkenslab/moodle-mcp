# A workshop as its participant sees it

Issue: [#66](https://github.com/falkenslab/moodle-mcp/issues/66)

## Goal

A student's agent finds what it has to do in a workshop (the phase, its own submission, the submissions allocated to it, and the assessment form), so it can assess peers without the browser tools.

## Context

A student has `assess_workshop_submission`, `get_workshop_submission` and `save_workshop_submission`, but no tool tells them which submissions are theirs to assess, nor what the form asks:
- `get_workshop` is the teacher's: it reads the report, which is empty for a participant.
- `get_workshop_assessment_form` reads the teacher's editing form.

The only way left is `browser_navigate` and `browser_snapshot`. The driver has no participant-side read of a workshop. Found testing padawan (the student agent) on peer assessment, in the sandbox's course 2.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#111](https://github.com/falkenslab/moodle-driver/issues/111)): the workshop as the person sees it.
- A shared tool (both roles) giving the phase and the person's tasks, the instructions for authors and reviewers, their own submission, the submissions allocated to them (id, title, author, assessed or not, the grade given) and the form's criteria as `assess_workshop_submission` takes them. Built as `add-tool` says: its driver function in `TOOL_FUNCTIONS`, in the shared role list, read-only annotations.
- Authors through `src/people.ts`: aliases under pseudonymize, titles redacted, with a test in `test/tools/pseudonymize.test.ts`.
- `assess_workshop_submission`'s and `get_workshop_submission`'s descriptions point to it.
- The docs: the tool's area and its Spanish.

## Acceptance

- On the sandbox, as `alumno` in course 2's peer-assessment workshop, read only: the allocated submission with its id and an alias for its author, and the rubric's criteria and levels.
- In a workshop set up the same way in course 3, the only course these checks may change: with them, `assess_workshop_submission` saves an assessment, which then reads back as assessed.
- As a teacher, the same tool gives the phase and the instructions, without failing.
- Under pseudonymize, no other student's name in the result.
