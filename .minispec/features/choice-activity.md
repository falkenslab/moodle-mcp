# Choice activity

## Goal

Read and answer a choice activity.

## Context

- No run needed it yet; it's the last survey-like student activity.
- AJAX: `mod_choice_get_choice_options`, `mod_choice_submit_choice_response` (instance id from the view page); availability to confirm.

## Changes

- `type: "choice"` in `get_survey` and `submit_survey` if its form fits their layout model; otherwise `tools/choice.ts` with `get_choice` and `answer_choice`.
- Output: options with ids and limits, whether the answer can be changed, the current answer.

## Acceptance

- A choice in course 3 is answered, and reading it again shows the answer.
- A closed choice gives Moodle's message.
