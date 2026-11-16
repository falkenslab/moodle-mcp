# Whether an assignment must be submitted after saving

Issue: [#67](https://github.com/falkenslab/moodle-mcp/issues/67)

## Goal

Before saving anything, a student's agent knows whether saving leaves a draft that must be submitted, and whether submitting asks to accept a statement.

## Context

`get_assignment` gives `canEdit: true, canSubmit: false` before the first submission whatever the assignment's `submissiondrafts` setting. An agent told a student "saving it already hands it in", and the submission stayed a draft until `submit_assignment`. Whether submitting asks for the submission statement shows up only in `submit_assignment`'s error. Found testing padawan (the student agent) in the sandbox's course 2.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#113](https://github.com/falkenslab/moodle-driver/issues/113)): `studentAssignment` gives both.
- Then a bump, and `get_assignment`'s output schema gains them, with its description and `save_submission`'s saying that a draft needs `submit_assignment`.
- The docs: the tool's Spanish.

## Acceptance

- On the sandbox, as `alumno`, before saving, in course 2's "Tarea: el estilo de Python" (drafts on, statement required): `get_assignment` says a separate submit is needed and gives the statement's words. Read only.
- An assignment without drafts says saving hands it in.
