# Use cases for 0.4's areas

Issue: [#46](https://github.com/falkenslab/moodle-mcp/issues/46)

## Goal

The documentation shows, with real sessions, what a teacher does with the areas 0.4 added, as it does for grading or the forum.

## Context

- The use cases (`docs/content/use-cases/`, English and Spanish) are real Claude Code and Codex sessions against the sandbox, captured by `scripts/screenshots/` (`scenarios.json`, `seed.mjs`, `moodle.mjs`), with a screenshot of the result in Moodle.
- 0.4 added about 120 tools (glossaries, wikis, lessons, databases, feedback, workshops, statistics, course completion, badges…) and none has a use case yet.

## Changes

- Three or four new use cases, chosen for what teachers ask most, for example: a branching lesson from a unit's notes; a glossary built with the class (students add, the teacher approves); the quiz's statistics, which questions to fix; a workshop from submission to grades.
- Each one: its scenario in `scenarios.json`, its seed in `seed.mjs` (course 3 only), the session screenshots in both languages, a Moodle screenshot, the page in both languages, its row in the use cases' index.

## Acceptance

- The pages build in both languages with real screenshots; the scenarios run again with `scripts/screenshots/run.mjs`.
