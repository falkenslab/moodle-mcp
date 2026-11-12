# A workshop's assessment form

Issue: [#61](https://github.com/falkenslab/moodle-mcp/issues/61)

## Goal

A teacher's agent defines a workshop's assessment form, for each grading strategy, so the workshop can go on without typing it in Moodle.

## Context

The agent creates a workshop and moves it through its phases, and assesses submissions through its form (`assess_workshop_submission`), but can't define that form: its aspects or criteria are typed by hand in *Assessment form*. `set_rubric` already does this for assignments.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#104](https://github.com/falkenslab/moodle-driver/issues/104)): setting and reading the form, per strategy.
- `set_workshop_assessment_form` (teacher) with the strategy (`accumulative`, `comments`, `numerrors`, `rubric`) and its aspects or criteria, refused once assessments exist, and `get_workshop_assessment_form` to read it. Each tool as `add-tool` says: its driver functions in `TOOL_FUNCTIONS`, a role list (teacher), annotations, and `CONFIRMED` for what can't be undone, in English and Spanish.
- The docs: the tools' area and their Spanish.

## Acceptance

- On the sandbox's course 3: a rubric and an accumulative form set on a new workshop, read back as Moodle shows them, and a submission assessed through the form.
- A change after the first assessment is refused with a message that says why.
