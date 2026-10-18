# Workshops end to end

Issue: [#29](https://github.com/falkenslab/moodle-mcp/issues/29)

## Goal

A workshop runs through the tools from submission to grades: students submit, teachers give examples and calculate grades.

## Context

- Since 0.3.0 reviewers are allocated, but nobody can submit, so allocation couldn't be checked with real submissions.
- Driver functions: `workshopSubmission`, `saveWorkshopSubmission`, `workshopExamples`, `addWorkshopExample`, `editWorkshopExample`, `deleteWorkshopExample`, `assessWorkshopExample`, `calculateWorkshopGrades`, `overrideWorkshopGrade`.
- Waits on moodle-driver [#71](https://github.com/falkenslab/moodle-driver/issues/71): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `get_workshop_submission` and `save_workshop_submission` (student: title, HTML, attachments).
- `list_workshop_examples`, `add_workshop_example`, `edit_workshop_example`, `delete_workshop_example`, `assess_workshop_example` (teacher).
- `calculate_workshop_grades` and `override_workshop_grade` (teacher, grading scope).
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- In a workshop in course 3: the student submits, reviewers are allocated (the allocation tools checked with a real submission at last), an assessment made, grades calculated and read.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
