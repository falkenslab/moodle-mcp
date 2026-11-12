# add_section creates the section hidden

Issue: [#63](https://github.com/falkenslab/moodle-mcp/issues/63)

## Goal

A new section can be created hidden, so students never see it before the teacher shows it.

## Context

`add_section` has no `visible` input: a new section is visible until `edit_section` hides it, and the class sees it for that moment. Publishing hidden first is the rule the agents built on moodle-mcp follow for every new item (moodle-teacher's `publishing` skill). The driver's `addSection` has no such option.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#105](https://github.com/falkenslab/moodle-driver/issues/105)): `addSection` with `visible`.
- An optional `visible` input on `add_section`, the default as today, passed to the driver; its description says whether the section is ever visible, even briefly, as the driver finds.
- The docs: the tool's Spanish.

## Acceptance

- On the sandbox's course 3: a section created with `visible: false` is hidden in the course page and to a student.
- Without the input, `add_section` does what it does today.
