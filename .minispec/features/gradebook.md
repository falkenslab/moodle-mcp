# Gradebook

## Goal

Read the grader report and the gradebook setup; change items and add categories.

## Context

- 3 teacher sessions read the grader report; weights were planned by script and set by hand.
- `grade/report/grader/index.php` is a page; `core_grades_get_grade_tree` (AJAX) gives the setup; items are edited through gradebook forms, categories through `core_form_dynamic_form`.

## Changes

- `tools/gradebook.ts`: `get_grader_report` (items by participants, paginated) and `get_gradebook_setup` (categories, items, weights, aggregation), read-only; `update_grade_item` (category, weight, max grade) and `add_grade_category` (name, aggregation, parent), writes.

## Acceptance

- In course 3, a new category takes the assignment with a weight; `get_gradebook_setup` and the student's `get_my_grades` reflect it.
