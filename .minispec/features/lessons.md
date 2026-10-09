# Lessons

## Goal

`get_lesson_page` and `answer_lesson_page`: go through a lesson page by page.

## Context

- A student run had a lesson gating an escape room.
- Lesson pages are content or questions with jumps; `mod_lesson_get_page_data` and `mod_lesson_process_page` exist (AJAX to confirm); otherwise the `mod/lesson/view.php` forms.

## Changes

- `tools/lesson.ts`: `get_lesson_page` (current page: content as text, question and options, buttons); `answer_lesson_page` (an answer or a button; returns the feedback and the next page). Both follow `trail` (ADR-012).
- Starting and ending the attempt happen inside these two.

## Acceptance

- A seeded lesson in course 3 (content page, multichoice question, end) is completed through the tools, and its grade shows in `get_my_grades`.
- A wrong answer returns the lesson's feedback and where it jumps.
