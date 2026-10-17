# Quiz statistics

Issue: [#36](https://github.com/falkenslab/moodle-mcp/issues/36)

## Goal

A teacher sees which questions of a quiz work: facility, discrimination and how often each response was given.

## Context

- `get_quiz_results` gives attempts and marks, not Moodle's statistics report.
- Driver function: `quizStatistics`.
- Waits on moodle-driver [#78](https://github.com/falkenslab/moodle-driver/issues/78): done in `../moodle-driver`'s main, not released yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `get_quiz_statistics` (teacher, read-only): the quiz's figures and per question its indexes and response counts, for first, all or best attempts. Aggregates only: no person.

## Acceptance

- A quiz in course 3 with attempts: the statistics read and checked against the report.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
