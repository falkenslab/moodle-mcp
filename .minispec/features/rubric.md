# Rubric

## Goal

`get_rubric`: an assignment's grading method and its rubric or marking guide, with criteria and levels; `grade_submission` grading by them.

## Context

- A teacher run read a rubric as text (6 criteria, 4 levels) to grade.
- `grade_submission` takes a grade today; rubric levels need their ids.
- The definition is on `grade/grading/manage.php` and in the grading panel fragment (`gradingpanel`).

## Changes

- `tools/getRubric.ts`: input `activityId`; method (simple, rubric, guide), criteria with levels (id, definition, score). Read-only.
- `grade_submission`: rubric levels by id, or guide scores, when the method asks for them.

## Acceptance

- With a rubric added to the sandbox assignment, `get_rubric` lists it, and `grade_submission` grades by levels with the total Moodle computes.
