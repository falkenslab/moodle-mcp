# Results of choices, feedback and questionnaires

Issue: [#28](https://github.com/falkenslab/moodle-mcp/issues/28)

## Goal

A teacher reads what people answered in a choice, a feedback or a questionnaire.

## Context

- Students answer them (`answer_choice`, `submit_survey`); nothing reads the results.
- Driver functions: `choiceResults`, `surveyResults`.
- Waits on moodle-driver [#70](https://github.com/falkenslab/moodle-driver/issues/70): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `get_choice_results` and `get_survey_results` (teacher, read-only): counts per option or question, answers by person where the activity isn't anonymous.
- Respondents as aliases and their text answers redacted when the server pseudonymizes; an anonymous activity shows no one.
- People as aliases when the server pseudonymizes (`src/people.ts`), with a test in `test/tools/pseudonymize.test.ts`; aliases refused in text sent to Moodle.

## Acceptance

- The choice and the survey of course 3 answered by the student, then read as the teacher: counts and answers match.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
