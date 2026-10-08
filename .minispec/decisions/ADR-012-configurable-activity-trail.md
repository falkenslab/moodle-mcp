# ADR-012: Configurable activity trail for student tools

## Decision

Tools that view or do something as a student (read content, download files, watch videos, attempt quizzes) follow a `trail` setting (variable, argument and `configure`): `realistic` (the default) goes through the real pages at a human pace, so Moodle logs views and completion as for a person; `fast` uses AJAX and direct file URLs where possible, leaving less or no trail. Reads that leave no trail anyway (course structure, grades) don't depend on it.

## Motivation

padawan's rules ask for a realistic trail (no direct file URLs, real page visits, human pace), and Moodle's completion often depends on views. Other clients only want the content, fast. The owner chose a setting (decided 9 October 2026).

## Consequences

- Each student tool documents what it does in each mode, and its result says what was logged (viewed, completion state).
- `realistic` pacing adds waits; tools report progress for long ones (videos).
- `fast` may leave activities incomplete; the tool's result says so.
