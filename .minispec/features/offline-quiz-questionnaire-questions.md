# Questions for Offline Quiz and Questionnaire

Issue: [#65](https://github.com/falkenslab/moodle-mcp/issues/65)

## Goal

A teacher's agent puts questions in an Offline Quiz and a Questionnaire, so neither goes up empty.

## Context

`create_activity` creates both (mod_offlinequiz, mod_questionnaire), but no tool adds their questions: `add_questions_to_quiz` works on mod_quiz only, and Questionnaire has its own question types and pages. The driver reads and answers questionnaires (`get_survey`, `submit_survey`) but doesn't build them, and has nothing for Offline Quiz.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#107](https://github.com/falkenslab/moodle-driver/issues/107)): questions for both.
- For Offline Quiz: adding bank questions to a form group and creating the forms. For Questionnaire: adding questions of its types with their choices, in order and by page, before the first response. Each tool as `add-tool` says: its driver functions in `TOOL_FUNCTIONS`, a role list (teacher), annotations, and `CONFIRMED` for what can't be undone, in English and Spanish.
- The docs: the tools' area and their Spanish.

## Acceptance

- On the sandbox's course 3: an offline quiz with bank questions in a group and its forms created; a questionnaire with a text, a radio and a rate question, as Moodle shows them.
- A questionnaire with responses refuses new questions with a message that says why.
