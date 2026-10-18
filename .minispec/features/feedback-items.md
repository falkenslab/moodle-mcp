# Feedback activities: their questions

Issue: [#35](https://github.com/falkenslab/moodle-mcp/issues/35)

## Goal

A teacher builds a feedback activity's questions, not only reads its answers.

## Context

- A feedback is created with `create_activity` and answered with `submit_survey`; its questions are added by hand.
- Driver functions: `feedbackItems`, `addFeedbackItem`, `editFeedbackItem`, `moveFeedbackItem`, `deleteFeedbackItem`, `feedbackTemplates`, `useFeedbackTemplate`, `saveFeedbackTemplate`, `deleteFeedbackTemplate`, `FEEDBACK_ITEM_TYPES`.
- Waits on moodle-driver [#77](https://github.com/falkenslab/moodle-driver/issues/77): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `get_feedback_items`, `add_feedback_item`, `edit_feedback_item`, `move_feedback_item`, `delete_feedback_item` (teacher).
- `list_feedback_templates`, `use_feedback_template`, `save_feedback_template`, `delete_feedback_template`.

## Acceptance

- A feedback in course 3 given each item type, read back, answered by the student.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
